/**
 * @file src/components/cart/CartView.tsx
 * 购物车主视图组件 / Main cart view component
 *
 * 作用 / Purpose:
 *   购物车页的核心 UI 组件，包含：
 *   1. 挂载时调用 GET /api/cart 拉取购物车列表
 *   2. 展示商品列表（图片、名称、规格、价格、数量控制、删除按钮）
 *   3. 展示价格汇总区（件数、小计、结算入口）
 *   4. 展示推荐商品区（最多 3 条）
 *   5. 数量变更（乐观更新 → PATCH /api/cart/:id）
 *   6. 删除条目（乐观更新 → DELETE /api/cart/:id）
 *
 *   Core UI component for the cart page, including:
 *   1. Fetches cart list via GET /api/cart on mount
 *   2. Displays item list (image, name, specs, price, qty controls, delete button)
 *   3. Displays price summary (item count, subtotal, checkout link)
 *   4. Displays recommendation section (up to 3 items)
 *   5. Quantity changes (optimistic update → PATCH /api/cart/:id)
 *   6. Item removal (optimistic update → DELETE /api/cart/:id)
 *
 * 被引用于 / Imported by: src/app/[locale]/cart/page.tsx
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { getSessionId } from "@/lib/session-storage";
import { useCartStore } from "@/store/cart";
import { usePaymentStore } from "@/store/payment";
import { PayPalExpressButton } from "@/components/common/PayPalExpressButton";
import { RecommendationCard } from "./RecommendationCard";
import type { ApiResponse, CartItem, Recommendation } from "@/types";

/**
 * CartView — 购物车主视图
 * CartView — main cart view
 *
 * 无 props（所有数据从 Zustand store 和 API 获取）
 * No props (all data from Zustand store and API)
 */
export function CartView() {
  const t = useTranslations("cart");
  const tCommon = useTranslations("common");
  const tCheckout = useTranslations("checkout");
  const locale = useLocale() as "zh" | "en";

  /** 从 Zustand store 订阅 items 和操作方法 / Subscribe to items and actions from Zustand store */
  const { items, setItems, updateQuantity, removeItem } = useCartStore();
  const setExpressOrder = usePaymentStore((s) => s.setExpressOrder);
  const router = useRouter();

  /** 推荐商品列表（GET /api/recommendations 响应）/ Recommendation list */
  const [recs, setRecs] = useState<Recommendation[]>([]);
  /** 初始加载状态（控制 spinner）/ Initial loading state (controls spinner) */
  const [loading, setLoading] = useState(true);

  /**
   * fetchCart — 拉取购物车数据和推荐商品
   * fetchCart — fetch cart data and recommendations
   *
   * 流程 / Flow:
   *   1. GET /api/cart?sessionId=xxx → 更新 Zustand store（仅在返回非空时）
   *   2. 若购物车有商品，GET /api/recommendations?productId=xxx → 更新推荐列表
   *
   * Bug 防护 / Bug protection:
   *   当 API 返回空数组时不调用 setItems（避免覆盖 sessionStorage 中的有效数据）。
   *   这防止了 HMR 重置 mockCart 后把客户端正确数据清空的问题。
   *   Does not call setItems when API returns an empty array (prevents overwriting
   *   valid sessionStorage data). Guards against HMR resetting mockCart.
   *
   * 使用 useCallback 包裹避免 useEffect 依赖数组因函数引用变化导致无限循环
   * Wrapped in useCallback to prevent infinite loops from function reference changes in useEffect deps
   */
  const fetchCart = useCallback(async () => {
    setLoading(true);
    const sessionId = getSessionId();
    try {
      const res = await apiFetch<ApiResponse<CartItem[]>>(
        `/api/cart?sessionId=${sessionId}`,
        { panelId: "cart-ops" }  // 请求/响应写入购物车页 ApiPanel / Route to cart ApiPanel
      );
      // 仅在 API 返回非空数据时才覆盖 store（防止 HMR 导致的数据丢失）
      // Only overwrite store if API returns non-empty data (prevents HMR data loss)
      if (res.success && res.data && res.data.length > 0) {
        setItems(res.data);

        // 用第一个商品 ID 拉取推荐 / Fetch recommendations using the first product ID
        if (res.data[0]) {
          const recRes = await apiFetch<ApiResponse<Recommendation[]>>(
            `/api/recommendations?productId=${res.data[0].productId}&limit=3`,
            { panelId: "cart-recs" }
          );
          if (recRes.success && recRes.data) {
            setRecs(recRes.data);
          }
        }
      }
    } catch {
      // 演示场景：静默忽略错误 / Demo: silently ignore errors
    } finally {
      setLoading(false);
    }
  }, [setItems]);

  // 组件挂载时拉取数据 / Fetch data on component mount
  useEffect(() => {
    fetchCart(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchCart]);

  /**
   * handleQuantityChange — 修改购物车条目数量（乐观更新）
   * handleQuantityChange — update item quantity (optimistic update)
   *
   * 乐观更新模式：先更新 UI，再发 API 请求（更好的用户体验）。
   * Optimistic update: update UI first, then send API request (better UX).
   *
   * @param id CartItem.id
   * @param delta 数量变化量（+1 或 -1）/ Quantity change (+1 or -1)
   */
  const handleQuantityChange = async (id: string, delta: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const next = Math.max(1, item.quantity + delta);  // 最小数量为 1 / Minimum quantity is 1
    updateQuantity(id, next);  // 立即更新 store / Immediately update store
    await apiFetch(`/api/cart/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: next }),
      panelId: "cart-ops",
    });
  };

  /**
   * handleRemove — 删除购物车条目（乐观更新）
   * handleRemove — remove a cart item (optimistic update)
   *
   * @param id CartItem.id
   */
  const handleRemove = async (id: string) => {
    removeItem(id);  // 立即从 store 移除 / Immediately remove from store
    await apiFetch(`/api/cart/${id}`, {
      method: "DELETE",
      panelId: "cart-ops",
    });
  };

  /** 本地计算总金额（price 来自关联的 product）/ Locally computed total (price from product) */
  const total = items.reduce(
    (sum, i) => sum + (i.product?.price ?? 0) * i.quantity,
    0
  );

  // ── 加载状态 / Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── 空购物车状态 / Empty cart state ───────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="text-center py-24 space-y-4">
        <ShoppingBag size={48} className="mx-auto text-gray-300 dark:text-gray-600" />
        <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">
          {t("empty")}
        </p>
        <p className="text-sm text-gray-400">{t("emptyDesc")}</p>
        <Link
          href={`/${locale}/product`}
          className="inline-block mt-2 px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {t("continueShopping")}
        </Link>
      </div>
    );
  }

  // ── 正常渲染 / Normal render ──────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* 标题 / Title */}
      <h1 className="text-2xl font-bold">
        {t("title")}
        <span className="text-base font-normal text-gray-500 ml-2">
          ({items.length} {t("items")})
        </span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：购物车条目列表 / Left: cart item list */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            // 提取多语言字段 / Extract bilingual fields
            const name = item.product
              ? (item.product.name as { zh: string; en: string })[locale]
              : "Product";
            const image = item.product?.images?.[0];
            const price = item.product?.price ?? 0;

            return (
              <div
                key={item.id}
                className="flex gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800"
              >
                {/* 商品图片 / Product image */}
                {image && (
                  <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <Image src={image} alt={name} fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover" />
                  </div>
                )}

                {/* 商品信息 / Product info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{name}</p>
                  {/* 规格标签（如"青色 · 中杯"）/ Spec tags (e.g. "Teal · Medium") */}
                  <p className="text-xs text-gray-500 mt-0.5">
                    {Object.entries(item.specs as Record<string, string>)
                      .map(([, v]) => v)
                      .join(" · ")}
                  </p>
                  <p className="text-primary-600 dark:text-primary-400 font-bold mt-1">
                    ¥{(price * item.quantity).toFixed(2)}
                  </p>
                </div>

                {/* 右侧：删除按钮 + 数量控制 / Right: delete + qty controls */}
                <div className="flex flex-col items-end justify-between gap-2">
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    aria-label={t("remove")}
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuantityChange(item.id, -1)}
                      className="w-7 h-7 rounded border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      aria-label="Decrease"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item.id, 1)}
                      className="w-7 h-7 rounded border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      aria-label="Increase"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 右侧：价格汇总 + 结算按钮（sticky 跟随滚动）/ Right: price summary + checkout (sticky) */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 sticky top-20">
            <h2 className="font-bold text-base mb-4">{t("subtotal")}</h2>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>{items.length} {t("items")}</span>
                <span>¥{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>{tCommon("loading").replace("...", "")}</span>
                <span className="text-primary-600 dark:text-primary-400">
                  {tCheckout("freeShipping")}
                </span>
              </div>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 mt-4 pt-4 flex justify-between font-bold text-base">
              <span>{t("total")}</span>
              <span className="text-primary-600 dark:text-primary-400">
                ¥{total.toFixed(2)}
              </span>
            </div>
            <Link
              href={`/${locale}/checkout`}
              className="mt-4 block text-center py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              {t("checkout")}
            </Link>

            {/* PayPal 快捷结账 / PayPal express checkout */}
            {items.length > 0 && (
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {locale === "zh" ? "或者快捷结账" : "Or express checkout"}
                  </span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                </div>
                <PayPalExpressButton
                  amount={total}
                  currency="USD"
                  items={items.map((item) => ({
                    id: item.productId,
                    name: item.product
                      ? (item.product.name as { zh: string; en: string })[locale]
                      : item.productId,
                    unitPrice: item.product?.price ?? 0,
                    quantity: item.quantity,
                  }))}
                  onApprove={(orderId) => {
                    setExpressOrder(orderId);
                    router.push(`/${locale}/checkout`);
                  }}
                  onError={(e) => console.error("[PayPal Express] Error:", e)}
                  onCancel={() => console.info("[PayPal Express] Cancelled")}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 推荐商品区 / Recommendations section */}
      {recs.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4">{t("recommendations")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {recs.map((rec) => (
              <RecommendationCard key={rec.id} recommendation={rec} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
