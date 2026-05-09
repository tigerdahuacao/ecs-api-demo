/**
 * @file src/app/[locale]/checkout/page.tsx
 * 结算页路由 / Checkout page route
 *
 * 路由 / Route: /zh/checkout 或 /en/checkout
 *
 * 作用 / Purpose:
 *   组合结算视图（CheckoutView）和 ApiPanel 调试面板。
 *   注册的面板 id="checkout-order" 用于展示：
 *     - GET /api/cart（加载订单摘要）
 *     - GET /api/recommendations（加载冲动消费推荐）
 *     - （演示）模拟的 POST /api/orders
 *
 *   Composes the checkout view (CheckoutView) with the ApiPanel debug panel.
 *   The registered panel id="checkout-order" displays:
 *     - GET /api/cart (load order summary)
 *     - GET /api/recommendations (load impulse-buy recommendations)
 *     - (demo) simulated POST /api/orders
 *
 * 子组件 / Child components:
 *   - CheckoutView（订单摘要、运费信息、冲动消费推荐、下单按钮的主体 UI）
 *   - ApiPanel（调试面板注册，defaultPosition="right" 停靠在右侧）
 */
import { CheckoutView } from "@/components/checkout/CheckoutView";
import { ApiPanel } from "@/components/common/ApiPanel";

export const runtime = 'edge';

/**
 * CheckoutPage — 结算页
 * CheckoutPage — checkout page
 */
export default function CheckoutPage() {
  return (
    <div className="relative">
      {/* 结算主体 / Main checkout UI */}
      <CheckoutView />

      {/*
       * ApiPanel — 右侧调试面板
       * ApiPanel — right-side debug panel
       */}
      <ApiPanel
        id="checkout-order"
        title="POST /api/orders (demo)"
        defaultPosition="right"
        defaultOpen={false}
        suggestions={`1. 提交订单前应做最终库存校验，并对选中商品加乐观锁（防止并发超卖）。
2. 支付请求应通过后端中转，不要在前端直接暴露支付密钥。
3. 订单状态机应覆盖：待支付 → 支付中 → 已支付 → 已发货 → 已完成 → 已退款。
4. 支付回调需幂等处理，防止重复扣款。`}
        nextSteps={`1. 订单提交成功后清空购物车（数据库 + sessionStorage + Zustand）。
2. 跳转至订单详情页，并展示预计发货时间。
3. 触发订单确认邮件/短信发送。
4. 埋点记录结算漏斗事件（进入结算、提交点击、支付成功）。`}
      />
    </div>
  );
}
