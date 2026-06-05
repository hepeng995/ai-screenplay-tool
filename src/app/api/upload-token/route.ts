/**
 * 七牛云上传 Token API（Edge Runtime）
 * T3.1: GET /api/upload-token?key=xxx → { token, expiresAt, uploadUrl }
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateUploadToken } from '@/lib/qiniu/token';
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = 'edge';

export const GET = withErrorHandler<NextRequest>(async (request) => {
  const key = request.nextUrl.searchParams.get('key') ?? undefined;

  const { token, expiresAt } = await generateUploadToken(key);

  return NextResponse.json({
    success: true,
    token,
    expiresAt,
    // 七牛云上传地址（华南 z2 区域）
    uploadUrl: 'https://upload-z2.qiniup.com',
  });
});
