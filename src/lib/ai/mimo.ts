/**
 * mimo AI 调用封装
 * T2.3: Edge Runtime 兼容的 AI 转换
 */

import { SYSTEM_PROMPT, buildUserPrompt } from './prompt';

export interface TransformResult {
  success: boolean;
  yaml?: string;
  raw?: string;
  error?: string;
  elapsed?: number;
}

const MIMO_API_URL = process.env.MIMO_API_URL ?? 'https://token-plan-cn.xiaomimimo.com/v1';
const MIMO_API_KEY = process.env.MIMO_API_KEY ?? '';
const MIMO_MODEL = process.env.MIMO_MODEL ?? 'mimo-v2.5';

/** 单请求超时 30s */
const REQUEST_TIMEOUT_MS = 30_000;
/** 最大重试次数 */
const MAX_RETRIES = 2;
/** 重试退避基数 */
const RETRY_BASE_DELAY = 1_000;

/**
 * 从 AI 响应中提取 YAML 代码块
 */
export function extractYaml(raw: string): string | null {
  // 匹配 ```yaml ... ``` 代码块
  const codeBlockMatch = raw.match(/```ya?ml\s*\n([\s\S]*?)\n```/i);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // 兜底：尝试匹配裸 YAML（以 script: 开头）
  const yamlStart = raw.indexOf('script:');
  if (yamlStart >= 0) {
    return raw.slice(yamlStart).trim();
  }

  return null;
}

/**
 * 调用 mimo API（单次请求）
 */
async function callMimoApi(chapterTitle: string, chapterText: string): Promise<Response> {
  const userPrompt = buildUserPrompt(chapterTitle, chapterText);

  return fetch(`${MIMO_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MIMO_API_KEY}`,
    },
    body: JSON.stringify({
      model: MIMO_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 8192,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

/**
 * 将小说章节文本转换为 YAML 剧本
 * 含重试逻辑（指数退避：1s, 2s）
 */
export async function transformChapterToYaml(
  chapterTitle: string,
  chapterText: string,
): Promise<TransformResult> {
  const startTime = Date.now();

  if (!MIMO_API_KEY) {
    return {
      success: false,
      error: 'MIMO_API_KEY 未配置',
    };
  }

  let lastError = '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await callMimoApi(chapterTitle, chapterText);

      if (!response.ok) {
        lastError = `API 返回 ${response.status}: ${response.statusText}`;
        if (attempt < MAX_RETRIES) {
          await delay(RETRY_BASE_DELAY * Math.pow(2, attempt));
          continue;
        }
        break;
      }

      const data = await response.json();
      const raw = data?.choices?.[0]?.message?.content ?? '';

      if (!raw) {
        lastError = 'API 返回空内容';
        if (attempt < MAX_RETRIES) {
          await delay(RETRY_BASE_DELAY * Math.pow(2, attempt));
          continue;
        }
        break;
      }

      const yaml = extractYaml(raw);
      if (!yaml) {
        lastError = '无法从 AI 响应中提取 YAML';
        if (attempt < MAX_RETRIES) {
          await delay(RETRY_BASE_DELAY * Math.pow(2, attempt));
          continue;
        }
        break;
      }

      return {
        success: true,
        yaml,
        raw,
        elapsed: Date.now() - startTime,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_BASE_DELAY * Math.pow(2, attempt));
        continue;
      }
    }
  }

  return {
    success: false,
    error: lastError,
    elapsed: Date.now() - startTime,
  };
}

/** 并发控制：限制最多 3 个并发 AI 请求 */
const MAX_CONCURRENT = 3;
let runningCount = 0;
const waitQueue: (() => void)[] = [];

export async function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  // 排队等待
  if (runningCount >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waitQueue.push(resolve));
  }

  runningCount++;
  try {
    return await fn();
  } finally {
    runningCount--;
    // 唤醒下一个等待者
    const next = waitQueue.shift();
    if (next) next();
  }
}

/** 延迟工具函数 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
