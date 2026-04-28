import { ProductDetail } from "@/components/product/ProductDetail";
import { ApiPanel } from "@/components/common/ApiPanel";

export default function ProductPage() {
  return (
    <div className="relative">
      <ProductDetail />
      <ApiPanel
        id="product-add-to-cart"
        title="POST /api/cart"
        defaultPosition="right"
        defaultOpen={false}
        suggestions={`1. 使用乐观更新 (Optimistic Update) 立即更新 UI，等待响应后再回滚。
2. 对相同 sessionId + productId + specs 的加购请求做去重合并，避免创建重复记录。
3. 加购前可先检查库存 (stock)，避免无效写入。
4. 返回完整的购物车条目（含 product 关联），减少前端二次请求。`}
        nextSteps={`1. 更新本地 Zustand store，触发购物车 Badge 实时刷新。
2. 将购物车数据同步写入 sessionStorage，以防页面刷新丢失。
3. 展示成功 Toast 通知，提示用户商品已加入购物车。
4. 记录加购事件到埋点系统，用于后续转化率分析。`}
      />
    </div>
  );
}
