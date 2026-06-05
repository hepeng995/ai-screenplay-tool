/**
 * /api/download-url 路由单元测试
 * 验证七牛云下载签名 URL 接口
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock 七牛云 Token 模块，避免调用真实云服务
vi.mock('@/lib/qiniu/token', () => ({
  generateDownloadUrl: vi.fn(),
}));

import { GET } from '../download-url/route';
import { generateDownloadUrl } from '@/lib/qiniu/token';

const mockedGenerateDownloadUrl = vi.mocked(generateDownloadUrl);

/**
 * 构造 NextRequest GET 请求
 */
function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/download-url', () => {
  it('携带 key 参数应返回 200 和签名 URL', async () => {
    const signedUrl = 'http://cdn.example.com/test.yaml?e=1700000000&token=ak:sign';
    mockedGenerateDownloadUrl.mockResolvedValueOnce(signedUrl);

    const res = await GET(makeRequest('/api/download-url?key=test.yaml'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.url).toBe(signedUrl);
    expect(mockedGenerateDownloadUrl).toHaveBeenCalledWith('test.yaml');
  });

  it('缺少 key 参数应返回 400', async () => {
    const res = await GET(makeRequest('/api/download-url'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('key');
    // 不应调用 generateDownloadUrl
    expect(mockedGenerateDownloadUrl).not.toHaveBeenCalled();
  });

  it('空字符串 key 应返回 400', async () => {
    // searchParams.get('key') 对 ?key= 返回空字符串，应被判空
    const res = await GET(makeRequest('/api/download-url?key='));
    // 空字符串在 JavaScript 中为 falsy，因此进入 if (!key) 分支
    expect(res.status).toBe(400);
  });

  it('生成 URL 异常应返回 500', async () => {
    mockedGenerateDownloadUrl.mockRejectedValueOnce(
      new Error('七牛云环境变量未配置'),
    );

    const res = await GET(makeRequest('/api/download-url?key=f.yaml'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('七牛云');
  });

  it('非 Error 异常应返回默认错误信息', async () => {
    mockedGenerateDownloadUrl.mockRejectedValueOnce(null as never);

    const res = await GET(makeRequest('/api/download-url?key=f.yaml'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    // 非 Error 类型走统一 fallback message（PR-04 withErrorHandler）
    expect(json.error).toBe('服务器内部错误');
  });
});
