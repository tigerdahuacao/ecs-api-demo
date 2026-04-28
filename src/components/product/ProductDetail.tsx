"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { ShoppingCart, Check, Minus, Plus, Star } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { getSessionId } from "@/lib/session-storage";
import { useCartStore } from "@/store/cart";
import type { Product, ApiResponse, CartItem } from "@/types";

// Fallback product ID — in production, derive from URL or a listing page

const COLOR_SWATCHES: Record<string, string> = {
  teal: "bg-teal-500",
  white: "bg-white border border-gray-300",
  navy: "bg-blue-900",
  terracotta: "bg-orange-700",
  natural: "bg-amber-200",
  charcoal: "bg-gray-800",
  sage: "bg-green-500",
  blush: "bg-pink-300",
  slate: "bg-slate-500",
};

export function ProductDetail() {
  const t = useTranslations("product");
  const locale = useLocale() as "zh" | "en";
  const addItem = useCartStore((s) => s.addItem);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<ApiResponse<Product[]>>(
        "/api/products",
        { panelId: "product-list" }
      );
      if (res.success && res.data?.[0]) {
        setProduct(res.data[0]);
        // Pre-select first option of each spec
        const defaults: Record<string, string> = {};
        const specs = res.data[0].specs as unknown as Array<{
          key: string;
          options: Array<{ value: string }>;
        }>;
        specs.forEach((spec) => {
          if (spec.options[0]) defaults[spec.key] = spec.options[0].value;
        });
        setSelectedSpecs(defaults);
      }
    } catch {
      // silently ignore for demo
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProduct(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchProduct]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    try {
      const sessionId = getSessionId();
      const res = await apiFetch<ApiResponse<CartItem>>("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          productId: product.id,
          quantity,
          specs: selectedSpecs,
        }),
        panelId: "product-add-to-cart",
      });
      if (res.success && res.data) {
        addItem(res.data);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      }
    } catch {
      // silently ignore
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p>No product found. Please seed the database first.</p>
        <code className="text-xs mt-2 block">pnpm prisma db seed</code>
      </div>
    );
  }

  const name = (product.name as { zh: string; en: string })[locale];
  const description = (product.description as { zh: string; en: string })[locale];
  const specs = product.specs as unknown as Array<{
    key: string;
    name: { zh: string; en: string };
    options: Array<{ value: string; label: { zh: string; en: string } }>;
  }>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
      {/* Image gallery */}
      <div className="space-y-3">
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
          <Image
            src={product.images[activeImage] ?? product.images[0]}
            alt={name}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            priority
          />
          {product.stock > 0 ? (
            <span className="absolute top-3 left-3 bg-primary-500 text-white text-xs px-2 py-1 rounded-full font-medium">
              {t("inStock")}
            </span>
          ) : (
            <span className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
              {t("outOfStock")}
            </span>
          )}
        </div>
        {product.images.length > 1 && (
          <div className="flex gap-2">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  i === activeImage
                    ? "border-primary-500"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <Image src={img} alt={`${name} ${i + 1}`} fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="flex flex-col gap-5">
        {/* Rating placeholder */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={14}
              className={n <= 4 ? "fill-amber-400 text-amber-400" : "text-gray-300"}
            />
          ))}
          <span className="text-sm text-gray-500 ml-1">(128)</span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
            {name}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            {description}
          </p>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-primary-600 dark:text-primary-400">
            ¥{product.price.toFixed(2)}
          </span>
          <span className="text-sm text-gray-400 line-through">
            ¥{(product.price * 1.2).toFixed(2)}
          </span>
        </div>

        {/* Specs */}
        {specs.map((spec) => (
          <div key={spec.key}>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {spec.name[locale]}
              {selectedSpecs[spec.key] && (
                <span className="font-normal text-gray-500 ml-2">
                  {spec.options.find((o) => o.value === selectedSpecs[spec.key])?.label[locale]}
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {spec.options.map((opt) => {
                const isColor = spec.key === "color";
                const selected = selectedSpecs[spec.key] === opt.value;
                if (isColor) {
                  return (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setSelectedSpecs((prev) => ({ ...prev, [spec.key]: opt.value }))
                      }
                      className={`w-8 h-8 rounded-full transition-all ${COLOR_SWATCHES[opt.value] ?? "bg-gray-400"} ${
                        selected ? "ring-2 ring-offset-2 ring-primary-500 scale-110" : ""
                      }`}
                      title={opt.label[locale]}
                    />
                  );
                }
                return (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setSelectedSpecs((prev) => ({ ...prev, [spec.key]: opt.value }))
                    }
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                      selected
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-medium"
                        : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary-300"
                    }`}
                  >
                    {opt.label[locale]}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Quantity */}
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t("quantity")}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>
            <span className="w-8 text-center font-semibold text-lg">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Increase quantity"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Add to cart button */}
        <button
          onClick={handleAddToCart}
          disabled={adding || product.stock === 0}
          className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
            added
              ? "bg-green-500 text-white"
              : "bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          }`}
        >
          {added ? (
            <>
              <Check size={18} />
              {t("addedSuccess")}
            </>
          ) : adding ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t("adding")}
            </>
          ) : (
            <>
              <ShoppingCart size={18} />
              {t("addToCart")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
