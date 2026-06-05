/**
 * mimo-poc.ts
 *
 * PoC: 验证 mimo-v2.5 模型在"小说文本 -> YAML 剧本"任务上的可行性与性能。
 *
 * 目标：
 *   1. 验证 API 调用链路（OpenAI 兼容协议）
 *   2. 测量不同输入长度下的端到端耗时
 *   3. 评估输出 YAML 的合法率与字段完整度
 *
 * 运行：
 *   cd poc
 *   npx tsx mimo-poc.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';
import yaml from 'js-yaml';

// 加载 .env.local（项目根目录）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
dotenv.config({ path: resolve(projectRoot, '.env.local') });

// ===== 类型定义 =====
interface ApiChatResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    index?: number;
    message?: { role?: string; content?: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  // 错误响应字段
  error?: { message?: string; type?: string; code?: string | number };
}

interface SampleSpec {
  name: 'short' | 'medium' | 'long';
  label: string;
  file: string;
  expected_chars: number;
  // 验收阈值（毫秒）
  sla_ms: number;
}

interface RunResult {
  sample: string;
  input_chars: number;
  http_status: number;
  elapsed_ms: number;
  timed_out: boolean;
  network_error?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  raw_output_chars?: number;
  yaml_block_extracted: boolean;
  yaml_valid: boolean;
  yaml_error?: string;
  yaml_keys?: string[];
  field_coverage: {
    has_script: boolean;
    has_metadata: boolean;
    has_acts: boolean;
    has_characters: boolean;
    has_dialogues: boolean;
    act_count: number;
    scene_count: number;
    dialogue_count: number;
    character_count: number;
  };
  output_preview?: string;
}

// ===== 常量 =====
const API_URL = process.env.MIMO_API_URL ?? 'https://token-plan-cn.xiaomimimo.com/v1';
const API_KEY = process.env.MIMO_API_KEY;
const MODEL = process.env.MIMO_MODEL ?? 'mimo-v2.5';

if (!API_KEY) {
  console.error('[FATAL] 未找到环境变量 MIMO_API_KEY，请确认 .env.local 文件存在');
  process.exit(1);
}

const SAMPLES: SampleSpec[] = [
  { name: 'short',  label: '短文本 ~500字',  file: 'samples/short.txt',  expected_chars: 500,  sla_ms: 15_000 },
  { name: 'medium', label: '中文本 ~3000字', file: 'samples/medium.txt', expected_chars: 3000, sla_ms: 25_000 },
  { name: 'long',   label: '长文本 ~6000字', file: 'samples/long.txt',   expected_chars: 6000, sla_ms: 45_000 },
];

const SYSTEM_PROMPT = `你是一位专业的剧本改编师。请将给定的小说章节文本转换为结构化的 YAML 格式剧本。

严格按下列 YAML Schema 输出（仅输出 YAML 代码块，不要解释，不要前后多余文字）：

\`\`\`yaml
script:
  title: "章节标题"
  source_chapter: "原文章节名或序号"
metadata:
  characters: [出场角色姓名列表（字符串数组）]
  location: "主要场景地点"
  time: "时间设定"
  summary: "本章一句话概要"
acts:
  - act_number: 1
    title: "第一幕标题"
    scenes:
      - scene_number: 1
        location: "场景地点"
        time: "时间"
        characters_present: [在场角色姓名]
        description: "场景视觉描述（一句话）"
        dialogues:
          - character: "说话人姓名"
            type: "对白"        # 对白 / 旁白 / 独白
            content: "台词原文"
            action: "说话时动作或表情（可选，无则留空字符串）"
\`\`\`

要求：
1. 输出必须以 \`\`\`yaml 开始、\`\`\` 结束，且整体能被 js-yaml 安全解析。
2. 所有对话和场景描述必须忠于原著，禁止编造剧情。
3. 角色姓名必须与原文一致，不要改写。
4. 每个场景至少包含 2 条对话；如原文不足，则如实呈现。
5. 仅输出一个 YAML 代码块，禁止输出 Markdown 标题或额外解释。`;

// ===== 工具函数 =====
function log(label: string, message: string) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${label}] ${message}`);
}

function readSample(file: string): string {
  const fullPath = resolve(__dirname, file);
  return readFileSync(fullPath, 'utf-8');
}

/** 从模型原始输出中提取首个 ```yaml ... ``` 代码块 */
function extractYamlBlock(raw: string): { ok: boolean; block?: string; error?: string } {
  // 兼容 ```yaml / ```YAML / ``` (无语言标识)
  const patterns = [
    /```ya?ml\s*\n([\s\S]*?)```/i,
    /```(?:\s*\n)?([\s\S]*?)```/,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m && m[1]) {
      return { ok: true, block: m[1].trim() };
    }
  }
  // 如果输出本身就是纯 yaml
  if (raw.trim().startsWith('script:') || raw.trim().startsWith('---')) {
    return { ok: true, block: raw.trim() };
  }
  return { ok: false, error: '未找到 yaml 代码块' };
}

function safeParseYaml(block: string): { ok: boolean; data?: any; error?: string } {
  try {
    const data = yaml.load(block);
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

function analyzeCoverage(data: any): RunResult['field_coverage'] {
  const cov: RunResult['field_coverage'] = {
    has_script: !!data?.script,
    has_metadata: !!data?.metadata,
    has_acts: Array.isArray(data?.acts) || Array.isArray(data?.script?.acts),
    has_characters: false,
    has_dialogues: false,
    act_count: 0,
    scene_count: 0,
    dialogue_count: 0,
    character_count: 0,
  };
  const acts = Array.isArray(data?.acts) ? data.acts : data?.script?.acts;
  if (Array.isArray(acts)) {
    cov.act_count = acts.length;
    for (const act of acts) {
      const scenes = act?.scenes;
      if (Array.isArray(scenes)) {
        cov.scene_count += scenes.length;
        for (const scene of scenes) {
          if (Array.isArray(scene?.characters_present) && scene.characters_present.length > 0) {
            cov.has_characters = true;
          }
          if (Array.isArray(scene?.dialogues) && scene.dialogues.length > 0) {
            cov.has_dialogues = true;
            cov.dialogue_count += scene.dialogues.length;
          }
        }
      }
    }
  }
  const metaChars = data?.metadata?.characters ?? data?.script?.metadata?.characters;
  if (Array.isArray(metaChars)) cov.character_count = metaChars.length;
  if (cov.character_count > 0) cov.has_characters = true;
  return cov;
}

function topKeys(data: any): string[] {
  if (!data || typeof data !== 'object') return [];
  return Object.keys(data);
}

// ===== 调用 API =====
async function callMimo(userText: string, timeoutMs: number): Promise<{
  status: number;
  elapsed: number;
  timedOut: boolean;
  json?: ApiChatResponse;
  rawBody?: string;
  networkError?: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = API_URL.replace(/\/+$/, '') + '/chat/completions';
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `请将以下小说章节文本改编为 YAML 剧本：\n\n${userText}` },
        ],
        temperature: 0.3,
        max_tokens: 8192,
      }),
      signal: controller.signal,
    });
    const elapsed = Date.now() - started;
    const rawBody = await res.text();
    let json: ApiChatResponse | undefined;
    try { json = JSON.parse(rawBody); } catch { /* ignore */ }
    return { status: res.status, elapsed, timedOut: false, json, rawBody };
  } catch (e: any) {
    const elapsed = Date.now() - started;
    const isAbort = e?.name === 'AbortError';
    return {
      status: 0,
      elapsed,
      timedOut: isAbort,
      networkError: isAbort ? `timeout after ${timeoutMs}ms` : (e?.message ?? String(e)),
    };
  } finally {
    clearTimeout(timer);
  }
}

// ===== 主流程 =====
async function runOne(spec: SampleSpec): Promise<RunResult> {
  const userText = readSample(spec.file);
  log(spec.name, `输入 ${userText.length} 字，开始调用 ${MODEL}（SLA=${spec.sla_ms}ms）`);
  // 给超时一个余量：SLA * 3，但至少 60 秒
  const hardTimeout = Math.max(spec.sla_ms * 3, 60_000);
  const resp = await callMimo(userText, hardTimeout);

  const result: RunResult = {
    sample: spec.name,
    input_chars: userText.length,
    http_status: resp.status,
    elapsed_ms: resp.elapsed,
    timed_out: resp.timedOut,
    network_error: resp.networkError,
    prompt_tokens: resp.json?.usage?.prompt_tokens,
    completion_tokens: resp.json?.usage?.completion_tokens,
    total_tokens: resp.json?.usage?.total_tokens,
    field_coverage: {
      has_script: false, has_metadata: false, has_acts: false,
      has_characters: false, has_dialogues: false,
      act_count: 0, scene_count: 0, dialogue_count: 0, character_count: 0,
    },
    yaml_block_extracted: false,
    yaml_valid: false,
  };

  if (resp.timedOut || resp.networkError || resp.status !== 200 || !resp.json) {
    log(spec.name, `调用失败: status=${resp.status} timeout=${resp.timedOut} err=${resp.networkError ?? '-'}`);
    if (resp.json?.error) log(spec.name, `API error: ${JSON.stringify(resp.json.error)}`);
    return result;
  }

  const content = resp.json.choices?.[0]?.message?.content ?? '';
  result.raw_output_chars = content.length;
  log(spec.name, `响应 ${content.length} 字，用时 ${resp.elapsed}ms，tokens prompt=${resp.json.usage?.prompt_tokens ?? '-'} / completion=${resp.json.usage?.completion_tokens ?? '-'}`);

  const extracted = extractYamlBlock(content);
  result.yaml_block_extracted = extracted.ok;
  if (!extracted.ok) {
    result.yaml_error = extracted.error;
    result.output_preview = content.slice(0, 400);
    return result;
  }

  // 保存提取的 YAML 块以便人工审查
  const resultsDir = resolve(__dirname, 'results');
  if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });
  writeFileSync(resolve(resultsDir, `${spec.name}.yaml`), extracted.block!, 'utf-8');

  const parsed = safeParseYaml(extracted.block!);
  result.yaml_valid = parsed.ok;
  if (!parsed.ok) {
    result.yaml_error = parsed.error;
    return result;
  }
  result.yaml_keys = topKeys(parsed.data);
  result.field_coverage = analyzeCoverage(parsed.data);
  return result;
}

function summarize(results: RunResult[]): string {
  const lines: string[] = [];
  lines.push('# mimo-v2.5 PoC 自动生成的执行摘要\n');
  lines.push(`执行时间: ${new Date().toISOString()}`);
  lines.push(`Node.js: ${process.version}`);
  lines.push(`API: ${API_URL}`);
  lines.push(`Model: ${MODEL}\n`);

  lines.push('## 耗时表\n');
  lines.push('| 样本 | 输入字符 | HTTP | 耗时(ms) | SLA(ms) | 是否达标 | YAML合法 |');
  lines.push('|------|---------:|------|---------:|--------:|:--------:|:--------:|');
  for (const r of results) {
    const sla = SAMPLES.find((s) => s.name === r.sample)?.sla_ms ?? 0;
    const passSla = !r.timed_out && r.elapsed_ms <= sla;
    lines.push(
      `| ${r.sample} | ${r.input_chars} | ${r.http_status || '-'} | ${r.elapsed_ms} | ${sla} | ${passSla ? '✅' : '❌'} | ${r.yaml_valid ? '✅' : '❌'} |`,
    );
  }

  lines.push('\n## Token 使用\n');
  lines.push('| 样本 | prompt_tokens | completion_tokens | total_tokens |');
  lines.push('|------|-------------:|------------------:|-------------:|');
  for (const r of results) {
    lines.push(`| ${r.sample} | ${r.prompt_tokens ?? '-'} | ${r.completion_tokens ?? '-'} | ${r.total_tokens ?? '-'} |`);
  }

  lines.push('\n## YAML 字段覆盖\n');
  lines.push('| 样本 | script | metadata | acts | scenes | dialogues | characters | acts# | scenes# | dialogues# |');
  lines.push('|------|:------:|:--------:|:----:|:------:|:---------:|:----------:|------:|--------:|-----------:|');
  for (const r of results) {
    const c = r.field_coverage;
    lines.push(
      `| ${r.sample} | ${c.has_script ? '✓' : ' '} | ${c.has_metadata ? '✓' : ' '} | ${c.has_acts ? '✓' : ' '} | ${c.scene_count > 0 ? '✓' : ' '} | ${c.has_dialogues ? '✓' : ' '} | ${c.has_characters ? '✓' : ' '} | ${c.act_count} | ${c.scene_count} | ${c.dialogue_count} |`,
    );
  }

  if (results.some((r) => r.network_error || r.yaml_error)) {
    lines.push('\n## 错误信息\n');
    for (const r of results) {
      if (r.network_error) lines.push(`- ${r.sample} network: ${r.network_error}`);
      if (r.yaml_error)    lines.push(`- ${r.sample} yaml:    ${r.yaml_error}`);
    }
  }
  return lines.join('\n');
}

(async () => {
  log('main', `开始 PoC，共 ${SAMPLES.length} 个样本，模型 ${MODEL}`);
  const results: RunResult[] = [];
  for (const spec of SAMPLES) {
    const r = await runOne(spec);
    results.push(r);
  }

  const resultsDir = resolve(__dirname, 'results');
  if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });

  // 保存详细 JSON
  writeFileSync(
    resolve(resultsDir, 'summary.json'),
    JSON.stringify({ model: MODEL, api_url: API_URL, run_at: new Date().toISOString(), results },
      null, 2),
    'utf-8',
  );

  // 保存可读摘要
  const md = summarize(results);
  writeFileSync(resolve(resultsDir, 'summary.md'), md, 'utf-8');

  console.log('\n================= 摘要 =================');
  console.log(md);
  console.log('=========================================');

  // 退出码：所有样本都满足 (YAML合法 + 满足SLA)
  const allPass = results.every((r) => r.yaml_valid && r.elapsed_ms <= (SAMPLES.find(s => s.name === r.sample)?.sla_ms ?? 0));
  process.exit(allPass ? 0 : 1);
})();
