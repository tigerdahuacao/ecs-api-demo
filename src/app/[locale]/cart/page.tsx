import { CartView } from "@/components/cart/CartView";
import { ApiPanel } from "@/components/common/ApiPanel";

export default function CartPage() {
  return (
    <div className="relative">
      <CartView />
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
