/**
 * AI 转换 API 路由（Edge Runtime）
 * T2.3: POST /api/convert
 */

import { NextRequest, NextResponse } from 'next/server';
import { transformChapterToYaml, withConcurrencyLimit } from '@/lib/ai/mimo';
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = 'edge';
export const maxDuration = 25; // Vercel Edge Runtime 限制

interface ConvertRequest {
  chapterTitle?: string;
  chapterText: string;
}

export const POST = withErrorHandler<NextRequest>(async (request) => {
  const body: ConvertRequest = await request.json();

  if (!body.chapterText || body.chapterText.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: '章节文本不能为空' },
      { status: 400 },
    );
  }

  // 字数限制（Edge Runtime payload 限制）
  if (body.chapterText.length > 10_000) {
    return NextResponse.json(
      { success: false, error: '单章节文本不能超过 10000 字' },
      { status: 400 },
    );
  }

  const title = body.chapterTitle ?? '未命名章节';

  const result = await withConcurrencyLimit(() =>
    transformChapterToYaml(title, body.chapterText),
  );

  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result, { status: 200 });
});
