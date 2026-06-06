/**
 * /api/convert 路由单元测试
 * 验证章节文本转换为 YAML 的请求校验和错误处理
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock mimo 模块，避免调用真实 AI API
vi.mock('@/lib/ai/mimo', () => ({
  transformChapterToYaml: vi.fn(),
}));

import { POST } from '../convert/route';
import { transformChapterToYaml } from '@/lib/ai/mimo';

const mockedTransform = vi.mocked(transformChapterToYaml);

/**
 * 构造 POST Request 对象
 */
function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/convert', () => {
  it('空 chapterText 应返回 400', async () => {
    const res = await POST(makeRequest({ chapterText: '' }) as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('不能为空');
  });

  it('缺少 chapterText 字段应返回 400', async () => {
    const res = await POST(makeRequest({}) as never);
    expect(res.status).toBe(400);
  });

  it('超过 10000 字应返回 400', async () => {
    const res = await POST(
      makeRequest({ chapterText: 'a'.repeat(10_001) }) as never,
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('10000');
  });

  it('AI 转换成功时应返回 200 和 YAML 内容', async () => {
    mockedTransform.mockResolvedValueOnce({
      success: true,
      yaml: 'script:\n  title: 测试',
      raw: '```yaml\nscript:\n  title: 测试\n```',
      elapsed: 100,
    });

    const res = await POST(
      makeRequest({ chapterTitle: '第一章', chapterText: '章节内容' }) as never,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.yaml).toContain('script:');
  });

  it('AI 转换失败时应返回 500', async () => {
    mockedTransform.mockResolvedValueOnce({
      success: false,
      error: 'AI 服务异常',
    });

    const res = await POST(
      makeRequest({ chapterText: '章节内容' }) as never,
    );
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('AI 服务异常');
  });

  it('chapterTitle 缺省时应使用 "未命名章节"', async () => {
    mockedTransform.mockResolvedValueOnce({
      success: true,
      yaml: 'script:',
      raw: 'script:',
      elapsed: 50,
    });

    await POST(makeRequest({ chapterText: '内容' }) as never);

    // 验证 transformChapterToYaml 第一个参数为默认标题，第三个参数为默认模板，第四个为 instruction（未传则为 undefined）
    expect(mockedTransform).toHaveBeenCalledWith('未命名章节', '内容', 'default', undefined);
  });

  it('JSON 解析失败应返回 500', async () => {
    const req = new Request('http://localhost/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json{',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('纯空白字符的 chapterText 也应返回 400', async () => {
    const res = await POST(
      makeRequest({ chapterText: '   \n\t  ' }) as never,
    );
    expect(res.status).toBe(400);
  });
});
