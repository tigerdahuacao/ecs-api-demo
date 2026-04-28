"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { getSessionId } from "@/lib/session-storage";
import { useCartStore } from "@/store/cart";
import { RecommendationCard } from "./RecommendationCard";
import type { ApiResponse, CartItem, Recommendation } from "@/types";

export function CartView() {
  const t = useTranslations("cart");
  const tCommon = useTranslations("common");
  const tCheckout = useTranslations("checkout");
  const locale = useLocale() as "zh" | "en";
  const { items, setItems, updateQuantity, removeItem } = useCartStore();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    setLoading(true);
    const sessionId = getSessionId();
    try {
      const res = await apiFetch<ApiResponse<CartItem[]>>(
        `/api/cart?sessionId=${sessionId}`,
        { panelId: "cart-ops" }
      );
      if (res.success && res.data) {
        setItems(res.data);

        // Fetch recommendations based on first cart item
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
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [setItems]);

  useEffect(() => {
    fetchCart(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchCart]);

  const handleQuantityChange = async (id: string, delta: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const next = Math.max(1, item.quantity + delta);
    updateQuantity(id, next);
    await apiFetch(`/api/cart/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: next }),
      panelId: "cart-ops",
    });
  };

  const handleRemove = async (id: string) => {
    removeItem(id);
    await apiFetch(`/api/cart/${id}`, {
      method: "DELETE",
      panelId: "cart-ops",
    });
  };

  const total = items.reduce(
    (sum, i) => sum + (i.product?.price ?? 0) * i.quantity,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">
        {t("title")}
        <span className="text-base font-normal text-gray-500 ml-2">
          ({items.length} {t("items")})
        </span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
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
                {image && (
                  <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <Image src={image} alt={name} fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {Object.entries(item.specs as Record<string, string>)
                      .map(([, v]) => v)
                      .join(" · ")}
                  </p>
                  <p className="text-primary-600 dark:text-primary-400 font-bold mt-1">
                    ¥{(price * item.quantity).toFixed(2)}
                  </p>
                </div>
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

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 sticky top-20">
            <h2 className="font-bold text-base mb-4">{t("subtotal")}</h2>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>
                  {items.length} {t("items")}
                </span>
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
          </div>
        </div>
      </div>

      {/* Recommendations */}
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
