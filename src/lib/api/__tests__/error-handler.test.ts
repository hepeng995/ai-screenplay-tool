/**
 * withErrorHandler 高阶函数单元测试
 * PR-04: API 错误处理高阶函数包装器
 */
import { describe, it, expect, vi } from 'vitest';
import { withErrorHandler } from '../error-handler';

describe('withErrorHandler', () => {
  // 测试 1: 正常 handler 返回值透传
  it('正常请求时透传 handler 返回值', async () => {
    const handler = async () => new Response('ok', { status: 200 });
    const wrapped = withErrorHandler(handler);
    const res = await wrapped(new Request('https://test.com'));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });

  // 测试 2: 一般 Error → 500
  it('一般错误返回 500 + JSON error', async () => {
    const handler = async () => {
      throw new Error('服务器内部错误');
    };
    const wrapped = withErrorHandler(handler);
    const res = await wrapped(new Request('https://test.com'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toBe('服务器内部错误');
  });

  // 测试 3: 返回 JSON 格式 { success: false, error: string }
  it('错误响应是 JSON 格式且有 success=false + error 字段', async () => {
    const handler = async () => {
      throw new Error('test');
    };
    const wrapped = withErrorHandler(handler);
    const res = await wrapped(new Request('https://test.com'));
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = await res.json();
    expect(body).toHaveProperty('success', false);
    expect(body).toHaveProperty('error', 'test');
  });

  // 测试 4: 环境变量错误也返回 500
  it('环境变量配置错误返回 500', async () => {
    const handler = async () => {
      throw new Error('七牛云环境变量未配置');
    };
    const wrapped = withErrorHandler(handler);
    const res = await wrapped(new Request('https://test.com'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('环境变量');
  });

  // 测试 5: 非 Error 类型抛出也返回 500
  it('非 Error 类型抛出返回 500 + 默认错误信息', async () => {
    const handler = async () => {
      throw 'string error'; // 非 Error 类型
    };
    const wrapped = withErrorHandler(handler);
    const res = await wrapped(new Request('https://test.com'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  // 测试 6: console.error 被调用
  it('错误时调用 console.error 记录日志', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = async () => {
      throw new Error('logged error');
    };
    const wrapped = withErrorHandler(handler);
    await wrapped(new Request('https://test.com'));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  // 测试 7: 正常请求时不调用 console.error
  it('正常请求时不调用 console.error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = async () => new Response('ok', { status: 200 });
    const wrapped = withErrorHandler(handler);
    await wrapped(new Request('https://test.com'));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
