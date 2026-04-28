/**
 * @file src/components/checkout/ImpulseItem.tsx
 * 结算页冲动消费推荐条目 / Impulse-buy recommendation item for checkout page
 *
 * 作用 / Purpose:
 *   在结算页展示紧凑的横向推荐商品条目（图片 + 名称/价格 + 加购按钮）。
 *   与购物车页的 RecommendationCard 功能相同，但样式为水平布局，适合结算页侧边栏。
 *
 *   Displays a compact horizontal recommendation item on the checkout page
 *   (image + name/price + add button). Same functionality as RecommendationCard
 *   in the cart page, but styled as a horizontal row for the checkout sidebar.
 *
 * 被引用于 / Imported by:
 *   CheckoutView.tsx（结算页"你可能还喜欢"区域，最多展示 2 条）
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
 * ImpulseItem — 冲动消费推荐条目（结算页，水平布局）
 * ImpulseItem — impulse-buy item (checkout page, horizontal layout)
 *
 * @param recommendation 推荐数据对象（来自 GET /api/recommendations 响应）
 *                       Recommendation object (from GET /api/recommendations response)
 *
 * 若 relatedProduct 未加载则返回 null（不渲染）
 * Returns null if relatedProduct is not loaded
 */
export function ImpulseItem({ recommendation }: Props) {
  const t = useTranslations("checkout");
  const locale = useLocale() as "zh" | "en";
  const addItem = useCartStore((s) => s.addItem);

  /** 是否刚加购成功（用于按钮绿色"已加入"状态）/ Whether just added (for green button state) */
  const [added, setAdded] = useState(false);
  /** 加购请求进行中 / Whether add-to-cart request is in progress */
  const [loading, setLoading] = useState(false);

  const product = recommendation.relatedProduct;
  if (!product) return null;

  const name = (product.name as { zh: string; en: string })[locale];
  const image = product.images?.[0];

  /**
   * handleAdd — 加购冲动消费商品
   * handleAdd — add the impulse-buy product to cart
   *
   * 流程与 RecommendationCard.handleAdd() 相同，panelId 指向 "checkout-order"
   * Same flow as RecommendationCard.handleAdd(); panelId points to "checkout-order"
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
          specs: {},  // 冲动消费以默认规格加购 / Add with default (empty) specs
        }),
        panelId: "checkout-order",  // 写入结算页的 ApiPanel / Route to checkout page's ApiPanel
      });
      if (res.success && res.data) {
        addItem(res.data);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      }
    } catch {
      // 演示场景：静默忽略 / Demo: silently ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    /* 水平布局：左侧图片 + 右侧信息 + 最右侧加购按钮 */
    /* Horizontal layout: image left + info center + add button right */
    <div className="flex gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 items-center">
      {/* 商品图片（正方形缩略图）/ Product image (square thumbnail) */}
      {image && (
        <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
          <Image src={image} alt={name} fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover" />
        </div>
      )}

      {/* 商品名称 + 价格 / Name + price */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold line-clamp-2">{name}</p>
        <p className="text-primary-600 dark:text-primary-400 font-bold text-sm">
          ¥{product.price.toFixed(2)}
        </p>
      </div>

      {/* 加购按钮 / Add-to-cart button */}
      <button
        onClick={handleAdd}
        disabled={loading}
        className={`shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
          added
            ? "bg-green-500 text-white"
            : "bg-primary-600 hover:bg-primary-700 text-white"
        }`}
      >
        {added ? <Check size={12} /> : <Plus size={12} />}
        {t("addToOrder")}
      </button>
    </div>
  );
}
