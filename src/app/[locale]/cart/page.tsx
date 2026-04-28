/**
 * @file src/app/[locale]/cart/page.tsx
 * 购物车页路由 / Cart page route
 *
 * 路由 / Route: /zh/cart 或 /en/cart
 *
 * 作用 / Purpose:
 *   组合购物车视图（CartView）和 ApiPanel 调试面板。
 *   注册的面板 id="cart-ops" 用于展示：
 *     - GET /api/cart（拉取购物车列表）
 *     - PATCH /api/cart/:id（修改数量）
 *     - DELETE /api/cart/:id（删除条目）
 *   这三个 API 的请求/响应都会路由到同一个面板，以展示最近一次操作。
 *
 *   Composes the cart view (CartView) with the ApiPanel debug panel.
 *   The registered panel id="cart-ops" is used to display:
 *     - GET /api/cart (fetch cart list)
 *     - PATCH /api/cart/:id (update quantity)
 *     - DELETE /api/cart/:id (remove item)
 *   All three APIs route to the same panel, showing the most recent operation.
 *
 * 子组件 / Child components:
 *   - CartView（购物车列表、数量控制、总价、推荐商品的主体 UI）
 *   - ApiPanel（调试面板注册，defaultPosition="bottom" 停靠在底部）
 */
import { CartView } from "@/components/cart/CartView";
import { ApiPanel } from "@/components/common/ApiPanel";

/**
 * CartPage — 购物车页
 * CartPage — cart page
 */
export default function CartPage() {
  return (
    <div className="relative">
      {/* 购物车主体 / Main cart UI */}
      <CartView />

      {/*
       * ApiPanel — 底部调试面板
       * ApiPanel — bottom debug panel
       * defaultPosition="bottom" 在底部停靠，不遮挡购物车列表
       */}
      <ApiPanel
        id="cart-ops"
        title="GET /api/cart · PATCH /api/cart/:id · DELETE /api/cart/:id"
        defaultPosition="bottom"
        defaultOpen={false}
        suggestions={`1. 购物车应支持匿名用户 (sessionId) 和登录用户 (userId) 两种模式，登录后合并匿名购物车。
2. PATCH 更新数量时应检查库存上限，防止超卖。
3. 批量操作（如全选删除）建议使用 DELETE /api/cart?ids=a,b,c 批量端点，减少请求次数。
4. 价格应在服务端实时计算，客户端展示值仅作参考，避免价格篡改。`}
        nextSteps={`1. 购物车数量变更后，实时同步到 sessionStorage 和 Zustand store。
2. 提交至结算页前，再次验证库存状态（防止下单时库存耗尽）。
3. 展示运费计算逻辑（满额包邮、重量计费等）。
4. 记录购物车行为埋点（浏览时长、删除原因调研弹窗等）。`}
      />
    </div>
  );
}
