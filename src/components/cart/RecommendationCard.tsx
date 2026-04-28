/**
 * @file src/components/cart/RecommendationCard.tsx
 * 购物车页推荐商品卡片 / Recommendation card for the cart page
 *
 * 作用 / Purpose:
 *   展示一条推荐商品，包含商品图片、名称、价格和"加入购物车"按钮。
 *   点击按钮后以默认规格（空 specs）调用 POST /api/cart 加购，
 *   加购成功后按钮短暂变为绿色"已加入"状态（2 秒后复原）。
 *
 *   Displays a single recommended product with image, name, price,
 *   and an "Add to Cart" button. On click, calls POST /api/cart with
 *   default specs (empty), updates the Zustand cart store, and briefly
 *   shows a green "Added" state (resets after 2 seconds).
 *
 * 被引用于 / Imported by:
 *   CartView.tsx（购物车底部"猜你喜欢"推荐区，最多展示 3 条）
 *
 * 与 ImpulseItem.tsx 的区别 / Difference from ImpulseItem.tsx:
 *   功能相同，但样式不同。
 *   RecommendationCard 是卡片式（竖向，有图片占位区）；
 *   ImpulseItem 是行内紧凑式（横向，适合结算页侧边）。
 *   Same functionality, different styles.
 *   RecommendationCard is card-style (vertical, with image area);
 *   ImpulseItem is compact row-style (horizontal, for checkout sidebar).
 */
"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Plus, Check } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { getSessionId } from "@/lib/session-storage";
import { useCartStore } from "@/store/cart";
import type { Recommendation, ApiResponse, CartItem } from "@/types";

interface Props {
  /** 推荐数据（含 relatedProduct 完整商品信息）
   *  Recommendation data (with full relatedProduct info) */
  recommendation: Recommendation;
}

/**
 * RecommendationCard — 推荐商品卡片（购物车页）
 * RecommendationCard — recommended product card (cart page)
 *
 * @param recommendation 推荐数据对象（来自 GET /api/recommendations 响应）
 *                       Recommendation object (from GET /api/recommendations response)
 *
 * 若 relatedProduct 未加载则返回 null（不渲染）
 * Returns null if relatedProduct is not loaded
 */
export function RecommendationCard({ recommendation }: Props) {
  const t = useTranslations("cart");
  const locale = useLocale() as "zh" | "en";
  const addItem = useCartStore((s) => s.addItem);

  /** 是否刚加购成功（用于按钮状态切换）/ Whether just added (for button state) */
  const [added, setAdded] = useState(false);
  /** 加购请求进行中 / Whether the add-to-cart request is in progress */
  const [loading, setLoading] = useState(false);

  const product = recommendation.relatedProduct;
  // 若关联商品数据缺失则不渲染（防止空指针）/ Don't render if product data is missing
  if (!product) return null;

  const name = (product.name as { zh: string; en: string })[locale];
  const image = product.images?.[0];

  /**
   * handleAdd — 加购推荐商品（以空规格加购）
   * handleAdd — add the recommended product to cart (with empty specs)
   *
   * 流程 / Flow:
   *   1. 设置 loading 状态，禁用按钮防止重复点击
   *   2. 调用 POST /api/cart（panelId="cart-ops" 将数据写入购物车页 ApiPanel）
   *   3. 成功后调用 addItem 更新 Zustand store（触发 Navbar Badge 更新）
   *   4. 按钮显示 2 秒绿色"已加入"状态后复原
   */
  const handleAdd = async () => {
    setLoading(true);
    try {
      const sessionId = getSessionId();
      const res = await apiFetch<ApiResponse<CartItem>>("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          productId: product.id,
          quantity: 1,
          specs: {},  // 推荐商品以默认规格加购 / Add recommended product with default (empty) specs
        }),
        panelId: "cart-ops",  // 将请求/响应写入购物车页的 ApiPanel / Route to cart page's ApiPanel
      });
      if (res.success && res.data) {
        addItem(res.data);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);  // 2 秒后复原 / Reset after 2 seconds
      }
    } catch {
      // 演示场景：静默忽略错误 / Demo: silently ignore errors
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
      {/* 商品图片区 / Product image area */}
      {image && (
        <div className="relative aspect-square w-full bg-gray-100 dark:bg-gray-800">
          <Image src={image} alt={name} fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover" />
        </div>
      )}

      {/* 商品信息 + 加购按钮 / Product info + add-to-cart button */}
      <div className="p-3 flex-1 flex flex-col justify-between gap-2">
        <div>
          <p className="text-sm font-semibold line-clamp-2">{name}</p>
          <p className="text-primary-600 dark:text-primary-400 font-bold text-sm mt-1">
            ¥{product.price.toFixed(2)}
          </p>
        </div>
        <button
          onClick={handleAdd}
          disabled={loading}
          className={`flex items-center justify-center gap-1 w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
            added
              ? "bg-green-500 text-white"   // 加购成功态 / Added state
              : "bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900"
          }`}
        >
          {added ? (
            <><Check size={12} /> {t("addToCart")}</>
          ) : (
            <><Plus size={12} /> {t("addToCart")}</>
          )}
        </button>
      </div>
    </div>
  );
}
