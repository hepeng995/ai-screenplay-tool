/**
 * API 错误处理高阶函数包装器
 * PR-04: 统一处理路由中的错误，返回标准化的 JSON 响应
 *
 * 使用方式：
 * ```ts
 * export const POST = withErrorHandler(async (req) => { ... });
 * ```
 */
import { NextResponse } from 'next/server';

/**
 * 包装一个 API Route handler，统一捕获异常并返回标准 JSON 响应
 *
 * - 正常返回：透传 handler 的 Response
 * - 抛出 Error：返回 500 + { error: message }
 * - 抛出非 Error：返回 500 + { error: '服务器内部错误' }
 */
export function withErrorHandler<T extends Request>(
  handler: (req: T) => Promise<Response>,
): (req: T) => Promise<Response> {
  return async (req: T) => {
    try {
      return await handler(req);
    } catch (err) {
      // 提取错误信息：Error 使用 message，其他使用默认文案
      const message =
        err instanceof Error ? err.message : '服务器内部错误';

      // 服务端日志（Edge Runtime 中会输出到 Vercel logs）
      console.error('[API Error]', message);

      return NextResponse.json(
        { success: false, error: message },
        { status: 500 },
      );
    }
  };
}
