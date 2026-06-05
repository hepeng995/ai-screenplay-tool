/**
 * 七牛云上传 Token API（Edge Runtime）
 * T3.1: GET /api/upload-token?key=xxx → { token, expiresAt, uploadUrl }
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateUploadToken } from '@/lib/qiniu/token';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key') ?? undefined;

    const { token, expiresAt } = await generateUploadToken(key);

    return NextResponse.json({
      success: true,
      token,
      expiresAt,
      // 七牛云上传地址（华南 z2 区域）
      uploadUrl: 'https://upload-z2.qiniup.com',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '生成上传 Token 失败';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
