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

export function RecommendationCard({ recommendation }: Props) {
  const t = useTranslations("cart");
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
        panelId: "cart-ops",
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
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
      {image && (
        <div className="relative aspect-square w-full bg-gray-100 dark:bg-gray-800">
          <Image src={image} alt={name} fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover" />
        </div>
      )}
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
              ? "bg-green-500 text-white"
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
