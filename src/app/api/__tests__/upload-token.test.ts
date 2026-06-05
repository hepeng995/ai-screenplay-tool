/**
 * /api/upload-token 路由单元测试
 * 验证七牛云上传 Token 生成接口
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock 七牛云 Token 模块，避免调用真实云服务
vi.mock('@/lib/qiniu/token', () => ({
  generateUploadToken: vi.fn(),
}));

import { GET } from '../upload-token/route';
import { generateUploadToken } from '@/lib/qiniu/token';

const mockedGenerateUploadToken = vi.mocked(generateUploadToken);

/**
 * 构造 NextRequest GET 请求
 */
function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/upload-token', () => {
  it('携带 key 参数应返回 200 和 Token 信息', async () => {
    mockedGenerateUploadToken.mockResolvedValueOnce({
      token: 'test-token-abc',
      expiresAt: 1_700_000_000,
    });

    const res = await GET(makeRequest('/api/upload-token?key=demo.yaml'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.token).toBe('test-token-abc');
    expect(json.expiresAt).toBe(1_700_000_000);
    expect(json.uploadUrl).toBe('https://upload-z2.qiniup.com');
  });

  it('不传 key 参数也应正常返回 200', async () => {
    mockedGenerateUploadToken.mockResolvedValueOnce({
      token: 'no-key-token',
      expiresAt: 1_700_000_001,
    });

    const res = await GET(makeRequest('/api/upload-token'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.token).toBe('no-key-token');
    // 验证 generateUploadToken 被调用时 key 为 undefined
    expect(mockedGenerateUploadToken).toHaveBeenCalledWith(undefined);
  });

  it('Token 生成抛异常应返回 500', async () => {
    mockedGenerateUploadToken.mockRejectedValueOnce(
      new Error('七牛云环境变量未配置'),
    );

    const res = await GET(makeRequest('/api/upload-token?key=f.yaml'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('七牛云');
  });

  it('非 Error 异常应返回默认错误信息', async () => {
    // 模拟非 Error 类型的异常
    mockedGenerateUploadToken.mockRejectedValueOnce('unknown failure' as never);

    const res = await GET(makeRequest('/api/upload-token'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBeDefined();
  });
});
