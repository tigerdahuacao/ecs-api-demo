/**
 * @file src/components/checkout/CheckoutView.tsx
 * 结算页主视图组件 / Main checkout view component
 *
 * 作用 / Purpose:
 *   结算页的核心 UI 组件，包含：
 *   1. 挂载时调用 GET /api/cart 加载订单摘要
 *   2. 同时加载推荐商品（GET /api/recommendations，最多 2 条）
 *   3. 展示订单摘要（商品列表 + 运费信息）
 *   4. 展示冲动消费推荐区（ImpulseItem）
 *   5. 展示价格汇总 + 下单按钮（模拟，延迟 1.2s 后显示成功状态）
 *   6. 下单后清空购物车并展示成功页
 *
 *   Core UI component for the checkout page, including:
 *   1. Loads order summary via GET /api/cart on mount
 *   2. Simultaneously loads recommendations (GET /api/recommendations, max 2)
 *   3. Displays order summary (item list + shipping info)
 *   4. Displays impulse-buy recommendation section (ImpulseItem)
 *   5. Displays price summary + place order button (simulated, 1.2s delay)
 *   6. Clears cart and shows success page after order placement
 *
 * 被引用于 / Imported by: src/app/[locale]/checkout/page.tsx
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { CheckCircle, Package, Truck } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { getSessionId } from "@/lib/session-storage";
import { useCartStore } from "@/store/cart";
import { ImpulseItem } from "./ImpulseItem";
import type { ApiResponse, CartItem, Recommendation } from "@/types";

/**
 * CheckoutView — 结算页主视图
 * CheckoutView — main checkout view
 *
 * 无 props（所有数据从 Zustand store 和 API 获取）
 * No props (all data from Zustand store and API)
 */
export function CheckoutView() {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const locale = useLocale() as "zh" | "en";

  /** 从 Zustand store 订阅购物车数据 / Subscribe to cart data from Zustand store */
  const { items, setItems, clearCart } = useCartStore();

  /** 冲动消费推荐列表 / Impulse-buy recommendation list */
  const [recs, setRecs] = useState<Recommendation[]>([]);
  /** 初始加载状态 / Initial loading state */
  const [loading, setLoading] = useState(true);
  /** 正在提交订单 / Order is being placed */
  const [placing, setPlacing] = useState(false);
  /** 订单已提交成功（展示成功页）/ Order placed successfully (show success page) */
  const [placed, setPlaced] = useState(false);

  /**
   * fetchData — 加载结算页数据（购物车 + 推荐）
   * fetchData — load checkout page data (cart + recommendations)
   *
   * 注意：与 CartView 不同，这里没有 `res.data.length > 0` 的保护，
   * 因为结算页若购物车为空应正确显示空状态，而非保留旧数据。
   * Note: unlike CartView, there's no `res.data.length > 0` guard here,
   * because an empty cart on checkout should correctly show the empty state.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const sessionId = getSessionId();
    try {
      const res = await apiFetch<ApiResponse<CartItem[]>>(
        `/api/cart?sessionId=${sessionId}`,
        { panelId: "checkout-order" }  // 写入结算页 ApiPanel / Route to checkout ApiPanel
      );
      if (res.success && res.data) {
        setItems(res.data);

        // 若购物车有商品，加载推荐（取第一个商品 ID）
        // If cart has items, fetch recommendations (using first product ID)
        if (res.data[0]) {
          const recRes = await apiFetch<ApiResponse<Recommendation[]>>(
            `/api/recommendations?productId=${res.data[0].productId}&limit=2`,
            { panelId: "checkout-order" }
          );
          if (recRes.success && recRes.data) {
            setRecs(recRes.data);
          }
        }
      }
    } catch {
      // 演示场景：静默忽略 / Demo: silently ignore
    } finally {
      setLoading(false);
    }
  }, [setItems]);

  // 组件挂载时拉取数据 / Fetch data on component mount
  useEffect(() => {
    fetchData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchData]);

  /** 本地计算小计 / Locally computed subtotal */
  const subtotal = items.reduce(
    (sum, i) => sum + (i.product?.price ?? 0) * i.quantity,
    0
  );

  /**
   * handlePlaceOrder — 模拟下单
   * handlePlaceOrder — simulate placing an order
   *
   * 真实场景应调用 POST /api/orders，这里仅演示：
   * 1. 显示 loading 状态（按钮 spinner）
   * 2. 等待 1.2 秒（模拟服务端响应）
   * 3. 显示下单成功页（绿色 CheckCircle）
   * 4. 清空购物车（Zustand store + sessionStorage）
   *
   * In production, this should call POST /api/orders. Here it just demonstrates:
   * 1. Show loading state (button spinner)
   * 2. Wait 1.2 seconds (simulate server response)
   * 3. Show success page (green CheckCircle)
   * 4. Clear cart (Zustand store + sessionStorage)
   */
  const handlePlaceOrder = async () => {
    setPlacing(true);
    await new Promise((r) => setTimeout(r, 1200));  // 模拟网络延迟 / Simulate network delay
    setPlaced(true);
    clearCart();  // 清空 Zustand store + sessionStorage / Clear store + sessionStorage
  };

  // ── 加载状态 / Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── 下单成功状态 / Order placed success state ─────────────────────────────
  if (placed) {
    return (
      <div className="text-center py-24 space-y-4">
        <CheckCircle size={56} className="mx-auto text-green-500" />
        <h2 className="text-2xl font-bold">{t("orderPlaced")}</h2>
        <p className="text-gray-500">{t("orderPlacedDesc")}</p>
        <Link
          href={`/${locale}/product`}
          className="inline-block mt-4 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-semibold text-sm hover:bg-primary-700 transition-colors"
        >
          {tCart("continueShopping")}
        </Link>
      </div>
    );
  }

  // ── 正常渲染 / Normal render ──────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：订单详情 / Left: order details */}
        <div className="lg:col-span-2 space-y-4">

          {/* 订单摘要卡片 / Order summary card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-4 text-primary-600 dark:text-primary-400">
              <Package size={18} />
              <span className="font-semibold">{t("orderSummary")}</span>
            </div>
            <div className="space-y-3 divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((item) => {
                const name = item.product
                  ? (item.product.name as { zh: string; en: string })[locale]
                  : "Product";
                const image = item.product?.images?.[0];
                const price = item.product?.price ?? 0;

                return (
                  <div key={item.id} className="flex items-center gap-4 pt-3 first:pt-0">
                    {image && (
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                        <Image src={image} alt={name} fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-xs text-gray-500">
                        {tCart("quantity")}: {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 shrink-0">
                      ¥{(price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 运费信息（演示用静态文案）/ Shipping info (static demo text) */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-3 text-primary-600 dark:text-primary-400">
              <Truck size={18} />
              <span className="font-semibold">{t("shipping")}</span>
            </div>
            <p className="text-sm text-gray-500">标准快递 · 3-5 个工作日 · {t("freeShipping")}</p>
          </div>

          {/* 冲动消费推荐区 / Impulse-buy recommendations */}
          {recs.length > 0 && (
            <div>
              <h2 className="text-base font-bold mb-3">{t("impulse")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recs.map((rec) => (
                  <ImpulseItem key={rec.id} recommendation={rec} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右侧：支付汇总 + 下单按钮（sticky）/ Right: payment summary + place order (sticky) */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 sticky top-20 space-y-4">
            <h2 className="font-bold">{t("total")}</h2>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>{t("subtotal")}</span>
                <span>¥{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("shipping")}</span>
                <span className="text-primary-600 dark:text-primary-400">{t("freeShipping")}</span>
              </div>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex justify-between font-bold">
              <span>{t("total")}</span>
              <span className="text-xl text-primary-600 dark:text-primary-400">
                ¥{subtotal.toFixed(2)}
              </span>
            </div>
            {/* 下单按钮：购物车为空时禁用 / Place order button: disabled when cart is empty */}
            <button
              onClick={handlePlaceOrder}
              disabled={placing || items.length === 0}
              className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {placing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              {t("placeOrder")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
