/**
 * 七牛云下载签名 URL API（Edge Runtime）
 * T3.2: GET /api/download-url?key=xxx → { url }
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateDownloadUrl } from '@/lib/qiniu/token';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { success: false, error: '缺少文件 key 参数' },
        { status: 400 },
      );
    }

    const url = await generateDownloadUrl(key);

    return NextResponse.json({
      success: true,
      url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '生成下载 URL 失败';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
