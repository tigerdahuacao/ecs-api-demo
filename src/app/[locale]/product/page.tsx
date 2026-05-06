/**
 * @file src/app/[locale]/product/page.tsx
 * 商品详情页路由 / Product detail page route
 *
 * 路由 / Route: /zh/product 或 /en/product
 *
 * 作用 / Purpose:
 *   组合商品详情组件（ProductDetail）和 ApiPanel 调试面板。
 *   通过 <ApiPanel> 注册一个 id="product-add-to-cart" 的面板，
 *   当用户点击"加入购物车"时，apiFetch 会把 POST /api/cart 的请求/响应
 *   写入这个面板并自动展开。
 *
 *   Composes the product detail component (ProductDetail) with the ApiPanel debug panel.
 *   Registers a panel with id="product-add-to-cart" via <ApiPanel>.
 *   When the user clicks "Add to Cart", apiFetch writes the POST /api/cart
 *   request/response into this panel and auto-opens it.
 *
 * 子组件 / Child components:
 *   - ProductDetail（商品图片、规格选择、加购按钮的主体 UI）
 *   - ApiPanel（注册调试面板，本身不渲染 UI，由 ApiPanelProvider 在 layout 层渲染）
 */
import { ProductDetail } from "@/components/product/ProductDetail";
import { ApiPanel } from "@/components/common/ApiPanel";

/**
 * ProductPage — 商品详情页
 * ProductPage — product detail page
 *
 * 无 props（locale 由 layout 处理）/ No props (locale is handled by layout)
 */
export default function ProductPage() {
  return (
    <div className="relative">
      {/* 商品详情主体 / Main product detail UI */}
      <ProductDetail />

      {/*
       * ApiPanel — 调试面板注册
       * ApiPanel — debug panel registration
       *
       * id: 全局唯一标识，apiFetch 通过 panelId 找到此面板写入数据
       *     Globally unique ID; apiFetch uses panelId to route data to this panel
       * title: 工具栏显示的 API 路径描述
       *        API path description shown in toolbar
       * defaultPosition: 初始停靠方向（会被用户持久化设置覆盖）
       *                  Initial dock position (overridden by user's saved pref)
       * suggestions/nextSteps: "建议"和"下一步"标签页的静态文案
       *                        Static content for Suggestions and Next Steps tabs
       */}
      <ApiPanel
        id="product-add-to-cart"
        title="POST /api/cart · POST /api/paypal/create-order-express"
        defaultPosition="right"
        defaultOpen={false}
      />
    </div>
  );
}
