/**
 * AI 转换 API 路由（Node.js Serverless Runtime）
 * T2.3: POST /api/convert
 *
 * 支持两种模式：
 * - 默认模式：返回完整 JSON（向后兼容）
 * - 流式模式：GET 参数 stream=true，返回 SSE 流
 */

import { NextRequest, NextResponse } from 'next/server';
import { transformChapterToYaml, callMimoApiStreaming } from '@/lib/ai/mimo';
import { withErrorHandler } from '@/lib/api/error-handler';
import type { TemplateType } from '@/lib/ai/templates';

export const runtime = 'nodejs';
export const maxDuration = 60; // Vercel Serverless Runtime（AI 转换需要较长响应时间）

interface ConvertRequest {
  chapterTitle?: string;
  chapterText: string;
  templateId?: TemplateType;
  /** 用户自定义补充要求（可选） */
  instruction?: string;
}

export const POST = withErrorHandler<NextRequest>(async (request) => {
  const body: ConvertRequest = await request.json();

  if (!body.chapterText || body.chapterText.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: '章节文本不能为空' },
      { status: 400 },
    );
  }

  // 字数限制
  if (body.chapterText.length > 10_000) {
    return NextResponse.json(
      { success: false, error: '单章节文本不能超过 10000 字' },
      { status: 400 },
    );
  }

  const title = body.chapterTitle ?? '未命名章节';
  const templateId = body.templateId ?? 'default';
  // 限制自定义指令长度，避免过长 payload
  const instruction = typeof body.instruction === 'string' ? body.instruction.slice(0, 500) : undefined;

  // 流式模式：直接转发 AI SSE 流
  const useStream = new URL(request.url).searchParams.get('stream') === 'true';
  if (useStream) {
    try {
      console.info(`[convert] 开始流式转换: "${title}" (${body.chapterText.length} 字, template=${templateId})`);
      const startTime = Date.now();

      const upstreamStream = await callMimoApiStreaming(title, body.chapterText, templateId, instruction);

      console.info(`[convert] 上游 SSE 连接建立, 耗时 ${Date.now() - startTime}ms`);

      return new Response(upstreamStream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          // 允许客户端读取流式进度
          'X-Stream-Mode': 'true',
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '流式调用失败';
      console.error(`[convert] 流式转换失败: "${title}" → ${message}`);
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 },
      );
    }
  }

  // 默认模式：非流式 JSON 响应（向后兼容）
  console.info(`[convert] 开始非流式转换: "${title}" (${body.chapterText.length} 字)`);
  const result = await transformChapterToYaml(title, body.chapterText, templateId, instruction);

  if (!result.success) {
    console.error(`[convert] 非流式转换失败: "${title}" → ${result.error}`);
    return NextResponse.json(result, { status: 500 });
  }

  console.info(`[convert] 转换完成: "${title}", 耗时 ${result.elapsed}ms`);
  return NextResponse.json(result, { status: 200 });
});
