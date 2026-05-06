/**
 * @file src/components/product/ProductDetail.tsx
 * 商品详情主视图组件 / Main product detail view component
 *
 * 作用 / Purpose:
 *   商品详情页的核心 UI 组件，包含：
 *   1. 挂载时调用 GET /api/products 拉取商品列表并展示第一个商品
 *   2. 图片画廊（主图 + 缩略图切换）
 *   3. 星级评分占位
 *   4. 商品名称、描述、价格（含划线原价）
 *   5. 规格选择器（颜色色块 + 文字选项按钮）
 *   6. 数量步进器
 *   7. 加入购物车按钮（含加载/成功状态切换）
 *
 *   Core UI component for the product detail page, including:
 *   1. Fetches product list via GET /api/products on mount, displays the first product
 *   2. Image gallery (main image + thumbnail switcher)
 *   3. Star rating placeholder
 *   4. Product name, description, price (with strikethrough original price)
 *   5. Spec selector (color swatches + text option buttons)
 *   6. Quantity stepper
 *   7. Add-to-cart button (with loading/success state switching)
 *
 * 被引用于 / Imported by: src/app/[locale]/product/page.tsx
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingCart, Check, Minus, Plus, Star } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { getSessionId } from "@/lib/session-storage";
import { useCartStore } from "@/store/cart";
import { usePaymentStore } from "@/store/payment";
import { PayPalExpressButton } from "@/components/common/PayPalExpressButton";
import type { Product, ApiResponse, CartItem } from "@/types";

/**
 * 颜色规格值 → Tailwind CSS 色块类名的映射
 * Color spec value → Tailwind CSS swatch class name mapping
 *
 * 颜色选项按钮用这个映射渲染对应颜色的圆形色块
 * Color option buttons use this mapping to render colored circular swatches
 */
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

/**
 * ProductDetail — 商品详情主视图
 * ProductDetail — main product detail view
 *
 * 无 props（商品数据从 API 拉取，locale 从 hook 读取）
 * No props (product data fetched from API; locale read from hook)
 */
export function ProductDetail() {
  const t = useTranslations("product");
  const locale = useLocale() as "zh" | "en";

  /** 从 Zustand store 取加购方法 / Get addItem action from Zustand store */
  const addItem = useCartStore((s) => s.addItem);
  const setExpressOrder = usePaymentStore((s) => s.setExpressOrder);
  const router = useRouter();

  /** 当前展示的商品（从 API 拉取）/ Currently displayed product (from API) */
  const [product, setProduct] = useState<Product | null>(null);
  /** 初始加载状态（控制 spinner）/ Initial loading state (controls spinner) */
  const [loading, setLoading] = useState(true);
  /**
   * 当前选中的规格键值对
   * Currently selected spec key-value pairs
   * @example { color: "teal", size: "medium" }
   */
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({});
  /** 购买数量（最小 1）/ Purchase quantity (minimum 1) */
  const [quantity, setQuantity] = useState(1);
  /** 加购请求进行中（禁用按钮）/ Add-to-cart request in progress (disables button) */
  const [adding, setAdding] = useState(false);
  /** 加购成功瞬态（按钮变绿）/ Add-to-cart success transient (button turns green) */
  const [added, setAdded] = useState(false);
  /** 当前激活的主图 index / Currently active main image index */
  const [activeImage, setActiveImage] = useState(0);

  /**
   * fetchProduct — 拉取商品列表并使用第一个商品
   * fetchProduct — fetch product list and use the first product
   *
   * 初始化时同时预选每个规格的第一个选项
   * Also pre-selects the first option for each spec on initialization
   *
   * 使用 useCallback 包裹，避免 useEffect 依赖不稳定导致重复请求
   * Wrapped in useCallback to prevent repeated requests from unstable deps in useEffect
   */
  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<ApiResponse<Product[]>>(
        "/api/products",
        { panelId: "product-list" }  // 注意：此 panelId 未在页面注册，仅记录不显示 / Note: this panelId is not registered; data is recorded but not displayed
      );
      if (res.success && res.data?.[0]) {
        setProduct(res.data[0]);
        // 预选每个规格的第一个选项 / Pre-select the first option for each spec
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
      // 演示场景：静默忽略 / Demo: silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // 组件挂载时拉取商品 / Fetch product on component mount
  useEffect(() => {
    fetchProduct(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchProduct]);

  /**
   * handleAddToCart — 加入购物车
   * handleAddToCart — add product to cart
   *
   * 流程 / Flow:
   *   1. 设置 adding=true（按钮显示 spinner）
   *   2. 调用 POST /api/cart，panelId="product-add-to-cart" 将数据写入右侧 ApiPanel
   *   3. 成功后 addItem 更新 Zustand store（触发 Navbar Badge）
   *   4. added=true 使按钮变绿（2 秒后复原）
   */
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
        panelId: "product-add-to-cart",  // 写入商品页右侧 ApiPanel / Route to product page ApiPanel
      });
      if (res.success && res.data) {
        addItem(res.data);         // 更新 Zustand store / Update Zustand store
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      }
    } catch {
      // 演示场景：静默忽略 / Demo: silently ignore
    } finally {
      setAdding(false);
    }
  };

  // ── 加载状态 / Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── 无数据状态（需要先 seed 数据库）/ No data state (need to seed database first) ─
  if (!product) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p>No product found. Please seed the database first.</p>
        <code className="text-xs mt-2 block">pnpm prisma db seed</code>
      </div>
    );
  }

  // 提取多语言字段 / Extract bilingual fields
  const name = (product.name as { zh: string; en: string })[locale];
  const description = (product.description as { zh: string; en: string })[locale];
  // 规格数据包含 key（如 "color"）、多语言 name、以及选项列表（含多语言 label）
  // Spec data contains key (e.g. "color"), bilingual name, and options list (with bilingual labels)
  const specs = product.specs as unknown as Array<{
    key: string;
    name: { zh: string; en: string };
    options: Array<{ value: string; label: { zh: string; en: string } }>;
  }>;

  // ── 正常渲染 / Normal render ──────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

      {/* 左侧：图片画廊 / Left: image gallery */}
      <div className="space-y-3">
        {/* 主图区 / Main image area */}
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
          <Image
            src={product.images[activeImage] ?? product.images[0]}
            alt={name}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            priority  // LCP 图片，优先加载 / LCP image, preload
          />
          {/* 库存状态标签 / Stock status badge */}
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

        {/* 缩略图列表（多图时显示）/ Thumbnail list (shown when multiple images) */}
        {product.images.length > 1 && (
          <div className="flex gap-2">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  i === activeImage
                    ? "border-primary-500"         // 当前激活缩略图 / Active thumbnail
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <Image src={img} alt={`${name} ${i + 1}`} fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 右侧：商品信息 + 操作区 / Right: product info + actions */}
      <div className="flex flex-col gap-5">

        {/* 星级评分占位（演示用，固定 4 星）/ Star rating placeholder (demo, fixed 4 stars) */}
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

        {/* 商品名称 + 描述 / Name + description */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
            {name}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            {description}
          </p>
        </div>

        {/* 价格（实价 + 划线原价）/ Price (actual + strikethrough original) */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-primary-600 dark:text-primary-400">
            ¥{product.price.toFixed(2)}
          </span>
          {/* 划线原价（演示：实价 × 1.2）/ Strikethrough original (demo: actual × 1.2) */}
          <span className="text-sm text-gray-400 line-through">
            ¥{(product.price * 1.2).toFixed(2)}
          </span>
        </div>

        {/* 规格选择器 / Spec selectors */}
        {specs.map((spec) => (
          <div key={spec.key}>
            {/* 规格名称 + 当前选中的选项标签 / Spec name + currently selected option label */}
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

                // 颜色规格：渲染圆形色块按钮 / Color spec: render circular swatch button
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

                // 其他规格：渲染文字按钮 / Other specs: render text button
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

        {/* 数量步进器 / Quantity stepper */}
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t("quantity")}
          </p>
          <div className="flex items-center gap-3">
            {/* 减少按钮，最小值 1 / Decrease button, minimum 1 */}
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

        {/* 加入购物车按钮（三态：默认/加载中/已加购）/ Add-to-cart button (3 states: default/loading/added) */}
        <button
          onClick={handleAddToCart}
          disabled={adding || product.stock === 0}  // 库存为 0 时禁用 / Disabled when out of stock
          className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
            added
              ? "bg-green-500 text-white"     // 加购成功态：绿色 / Added state: green
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

        {/* PayPal 快捷结账分隔线 / PayPal express checkout divider */}
        {product.stock > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                {locale === "zh" ? "或者快捷结账" : "Or express checkout"}
              </span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>
            <PayPalExpressButton
              amount={product.price * quantity}
              currency="USD"
              items={[{
                id: product.id,
                name: (product.name as { zh: string; en: string })[locale],
                unitPrice: product.price,
                quantity,
              }]}
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
  );
}
