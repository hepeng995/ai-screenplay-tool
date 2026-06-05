/**
 * 七牛云上传 Token API（Edge Runtime）
 * T3.1: GET /api/upload-token?key=xxx → { token, expiresAt, uploadUrl }
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateUploadToken } from '@/lib/qiniu/token';
import { withErrorHandler } from '@/lib/api/error-handler';

export const runtime = 'edge';

/** 七牛云上传区域 → 上传域名映射 */
const REGION_UPLOAD_URLS: Record<string, string> = {
  z0: 'https://upload.qiniup.com',           // 华东
  z1: 'https://upload-z1.qiniup.com',         // 华北
  z2: 'https://upload-z2.qiniup.com',         // 华南
  na0: 'https://upload-na0.qiniup.com',       // 北美
  as0: 'https://upload-as0.qiniup.com',       // 东南亚
  'cn-east-2': 'https://upload-cn-east-2.qiniup.com', // 华东-浙江2
};

export const GET = withErrorHandler<NextRequest>(async (request) => {
  const key = request.nextUrl.searchParams.get('key') ?? undefined;

  const { token, expiresAt } = await generateUploadToken(key);

  // 从环境变量读取区域，默认华南 (z2)
  const region = process.env.QINIU_REGION ?? 'z2';
  const uploadUrl = REGION_UPLOAD_URLS[region] ?? REGION_UPLOAD_URLS['z2'];

  return NextResponse.json({
    success: true,
    token,
    expiresAt,
    uploadUrl,
  });
});
