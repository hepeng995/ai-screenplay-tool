/**
 * mimo AI 调用封装
 * T2.3: Node.js Serverless Runtime 兼容的 AI 转换
 */

import { buildUserPrompt, buildSystemPrompt } from './prompt';
import type { TemplateType } from './templates';

export interface TransformResult {
  success: boolean;
  yaml?: string;
  raw?: string;
  error?: string;
  elapsed?: number;
}

/** 流式转换过程中的进度回调 */
export type StreamProgressCallback = (chunk: string, accumulated: string) => void;

const MIMO_API_URL = process.env.MIMO_API_URL ?? 'https://token-plan-cn.xiaomimimo.com/v1';
const MIMO_API_KEY = process.env.MIMO_API_KEY ?? '';
const MIMO_MODEL = process.env.MIMO_MODEL ?? 'mimo-v2.5';

/** 单请求超时 45s（在 Node.js Serverless 60s maxDuration 内留出 buffer） */
const REQUEST_TIMEOUT_MS = 45_000;
/** 服务端不重试（重试由客户端处理，避免单次请求超出 maxDuration） */
const MAX_RETRIES = 0;
/** 重试退避基数 */
const RETRY_BASE_DELAY = 1_000;

/**
 * 从 AI 响应中提取 YAML 代码块
 */
export function extractYaml(raw: string): string | null {
  // 1. 优先匹配 ```yaml ... ``` 代码块（兼容无换行、有尾部空格等边界情况）
  const codeBlockMatch = raw.match(/```(?:ya?ml)?\s*\n([\s\S]*?)\n?```/i);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // 2. 兜底：从 script: 开始截取，并去除尾部可能残留的代码围栏
  const yamlStart = raw.indexOf('script:');
  if (yamlStart >= 0) {
    let content = raw.slice(yamlStart).trim();
    content = content.replace(/\n?```\s*$/i, '').trim();
    return content;
  }

  return null;
}

/**
 * 调用 mimo API（单次请求，非流式）
 */
async function callMimoApi(
  chapterTitle: string,
  chapterText: string,
  templateId: TemplateType = 'default',
  instruction?: string,
): Promise<Response> {
  const userPrompt = buildUserPrompt(chapterTitle, chapterText, instruction);
  const systemPrompt = buildSystemPrompt(templateId);

  return fetch(`${MIMO_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MIMO_API_KEY}`,
    },
    body: JSON.stringify({
      model: MIMO_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 8192,
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

/**
 * 将小说章节文本转换为 YAML 剧本（非流式，向后兼容）
 */
export async function transformChapterToYaml(
  chapterTitle: string,
  chapterText: string,
  templateId: TemplateType = 'default',
  instruction?: string,
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
      const response = await callMimoApi(chapterTitle, chapterText, templateId, instruction);

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

/**
 * 流式调用 mimo API，返回 ReadableStream（SSE 格式，直接转发给客户端）
 * 用于 /api/convert?stream=true 模式
 */
export async function callMimoApiStreaming(
  chapterTitle: string,
  chapterText: string,
  templateId: TemplateType = 'default',
  instruction?: string,
): Promise<ReadableStream<Uint8Array>> {
  if (!MIMO_API_KEY) {
    throw new Error('MIMO_API_KEY 未配置');
  }

  const userPrompt = buildUserPrompt(chapterTitle, chapterText, instruction);
  const systemPrompt = buildSystemPrompt(templateId);

  const response = await fetch(`${MIMO_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MIMO_API_KEY}`,
    },
    body: JSON.stringify({
      model: MIMO_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 8192,
      temperature: 0.4,
      stream: true,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`API 返回 ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
  }

  if (!response.body) {
    throw new Error('API 响应体为空，流式传输不可用');
  }

  // 直接转发上游 SSE 流，客户端自行解析
  return response.body;
}

/**
 * 客户端解析 SSE 流的工具函数
 * 从流式响应中累积完整文本，提取最终 YAML
 */
export async function readStreamToEnd(
  body: ReadableStream<Uint8Array>,
  onChunk?: StreamProgressCallback,
): Promise<TransformResult> {
  const startTime = Date.now();
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let sseBuffer = ''; // SSE 可能跨 chunk 分割

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });

      // 按行解析 SSE 数据
      const lines = sseBuffer.split('\n');
      // 最后一行可能不完整，留到下次处理
      sseBuffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const json = JSON.parse(data);
          const content = json?.choices?.[0]?.delta?.content ?? '';
          if (content) {
            accumulated += content;
            onChunk?.(content, accumulated);
          }
        } catch {
          // 非法 JSON 行（如心跳），忽略
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!accumulated) {
    return {
      success: false,
      error: 'AI 返回空内容',
      elapsed: Date.now() - startTime,
    };
  }

  const yaml = extractYaml(accumulated);
  if (!yaml) {
    return {
      success: false,
      error: '无法从 AI 响应中提取 YAML',
      raw: accumulated,
      elapsed: Date.now() - startTime,
    };
  }

  return {
    success: true,
    yaml,
    raw: accumulated,
    elapsed: Date.now() - startTime,
  };
}

/** 延迟工具函数 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
