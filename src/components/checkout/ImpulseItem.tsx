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
  recommendation: Recommendation;
}

export function ImpulseItem({ recommendation }: Props) {
  const t = useTranslations("checkout");
  const locale = useLocale() as "zh" | "en";
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  const product = recommendation.relatedProduct;
  if (!product) return null;

  const name = (product.name as { zh: string; en: string })[locale];
  const image = product.images?.[0];

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
          specs: {},
        }),
        panelId: "checkout-order",
      });
      if (res.success && res.data) {
        addItem(res.data);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 items-center">
      {image && (
        <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
          <Image src={image} alt={name} fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold line-clamp-2">{name}</p>
        <p className="text-primary-600 dark:text-primary-400 font-bold text-sm">
          ¥{product.price.toFixed(2)}
        </p>
      </div>
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
