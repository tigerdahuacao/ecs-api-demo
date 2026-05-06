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
        title="GET /api/cart · PATCH · DELETE · POST /api/paypal/create-order-express"
        defaultPosition="bottom"
        defaultOpen={false}
        defaultRequest={{
          method: "GET",
          url: "/api/cart?sessionId=<session-id>",
        }}
        defaultResponse={{
          status: 200,
          ok: true,
          data: [
            {
              id: "<cart-item-id>",
              productId: "<product-id>",
              quantity: 1,
              specs: { color: "teal", size: "medium" },
              product: { name: { zh: "青釉马克杯", en: "Celadon Mug" }, price: 89 },
            },
          ],
        }}
      />
    </div>
  );
}
