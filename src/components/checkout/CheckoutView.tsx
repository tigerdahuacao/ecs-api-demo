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

export function CheckoutView() {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const locale = useLocale() as "zh" | "en";
  const { items, setItems, clearCart } = useCartStore();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const sessionId = getSessionId();
    try {
      const res = await apiFetch<ApiResponse<CartItem[]>>(
        `/api/cart?sessionId=${sessionId}`,
        { panelId: "checkout-order" }
      );
      if (res.success && res.data) {
        setItems(res.data);

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
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [setItems]);

  useEffect(() => {
    fetchData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchData]);

  const subtotal = items.reduce(
    (sum, i) => sum + (i.product?.price ?? 0) * i.quantity,
    0
  );

  const handlePlaceOrder = async () => {
    setPlacing(true);
    // Simulate order submission
    await new Promise((r) => setTimeout(r, 1200));
    setPlaced(true);
    clearCart();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order items */}
        <div className="lg:col-span-2 space-y-4">
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

          {/* Shipping info placeholder */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-3 text-primary-600 dark:text-primary-400">
              <Truck size={18} />
              <span className="font-semibold">{t("shipping")}</span>
            </div>
            <p className="text-sm text-gray-500">标准快递 · 3-5 个工作日 · {t("freeShipping")}</p>
          </div>

          {/* Impulse buy */}
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

        {/* Payment summary */}
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
