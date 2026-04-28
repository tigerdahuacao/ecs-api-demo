import { CheckoutView } from "@/components/checkout/CheckoutView";
import { ApiPanel } from "@/components/common/ApiPanel";

export default function CheckoutPage() {
  return (
    <div className="relative">
      <CheckoutView />
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
