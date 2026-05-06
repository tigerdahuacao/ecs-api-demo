/**
 * @file src/lib/route-logger.ts
 * Route Handler 日志装饰器（高阶函数 / Decorator 模式）
 * Route handler logging decorator (Higher-Order Function / Decorator pattern)
 *
 * TypeScript 5.x 支持 TC39 Stage 3 装饰器，但装饰器语法只能作用于 class 成员，
 * 无法直接装饰 Next.js App Router 的独立 export 函数。
 * 本模块用高阶函数实现等价的 Decorator 设计模式，无需额外 tsconfig 配置。
 *
 * TS 5.x supports TC39 Stage 3 decorators, but @decorator syntax only applies to
 * class members — not standalone Next.js App Router exports. This HOF implements
 * the equivalent Decorator design pattern with no tsconfig changes needed.
 *
 * withLogger 负责 / withLogger handles:
 *   - 入口日志: "${tag} <- METHOD"
 *   - 出口日志: "${tag} -> STATUS (Xms)"
 *   - 未处理异常 -> console.error + HTTP 500
 *
 * 被引用于 / Imported by: src/app/api/paypal/* /route.ts
 */

/**
 * Generic handler type. Req must extend the Web standard Request so that
 * Next.js's route type checker recognises exported handlers correctly.
 */
type RouteHandler<Req extends Request = Request> = (req: Req) => Promise<Response>;

/**
 * withLogger — Route Handler HOF Decorator
 *
 * Wraps a route handler with entry/exit logging and unhandled exception fallback.
 * The handler body needs no outer try/catch for unhandled errors.
 *
 * @param tag     Log prefix, e.g. "[/api/paypal/create-order]"
 * @param handler Original route handler function
 * @returns       Decorated handler with the same call signature
 *
 * @example
 * export const POST = withLogger("[/api/paypal/create-order]", async (req: NextRequest) => {
 *   console.log("request body:", body);
 *   return NextResponse.json({ success: true, data: { orderId } });
 * });
 */
export function withLogger<Req extends Request = Request>(
  tag: string,
  handler: RouteHandler<Req>
): RouteHandler<Req> {
  return async (req: Req): Promise<Response> => {
    const start = Date.now();
    console.log(`${tag} <- ${req.method}`);
    try {
      const res = await handler(req);
      console.log(`${tag} -> ${res.status} (${Date.now() - start}ms)`);
      return res;
    } catch (err) {
      console.error(`${tag} EXCEPTION (${Date.now() - start}ms):`, err);
      return Response.json(
        { success: false, error: `Internal error: ${String(err)}` },
        { status: 500 }
      );
    }
  };
}
