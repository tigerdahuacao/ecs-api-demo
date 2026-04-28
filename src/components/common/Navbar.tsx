/**
 * @file src/components/common/Navbar.tsx
 * 顶部导航栏 / Top navigation bar
 *
 * 作用 / Purpose:
 *   展示 Logo、导航链接（商品/购物车/结算）、语言切换器、主题切换按钮。
 *   购物车图标上有实时 Badge 显示购物车总件数。
 *
 *   Displays Logo, nav links (Product / Cart / Checkout),
 *   language switcher, and theme toggle.
 *   The cart icon has a live badge showing the total item count.
 *
 * 特殊处理 / Special behavior:
 *   当 top 位置的 ApiPanel 处于 sidebar 展开状态时，Navbar 的 sticky top 值必须
 *   等于面板高度，否则 Navbar 会滚动到固定面板后面（被遮住）。
 *   通过 useApiPanelNavbarTop() hook 动态计算 top 值。
 *
 *   When a top-docked ApiPanel sidebar is open, the Navbar's sticky top must
 *   equal the panel height, or the Navbar would scroll behind the fixed panel.
 *   useApiPanelNavbarTop() dynamically computes the top offset.
 *
 * 被引用于 / Imported by: src/app/[locale]/layout.tsx
 */
"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ShoppingCart, Package } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useCartStore } from "@/store/cart";
import { useApiPanelNavbarTop } from "@/store/api-panel";

/**
 * Navbar — 顶部导航栏组件
 * Navbar — top navigation bar component
 *
 * 无 props / No props（从 store 和 hooks 读取所需数据）
 */
export function Navbar() {
  const t = useTranslations("nav");
  const locale = useLocale();

  /**
   * totalCount — 购物车总件数，用于 Badge 显示
   * totalCount — total cart item count, used for the badge
   * 订阅 Zustand store，购物车变化时自动重渲染
   * Subscribes to Zustand store; re-renders automatically when cart changes
   */
  const totalCount = useCartStore((s) => s.totalCount());

  /**
   * stickyTop — Navbar 的 sticky top 偏移量（px）
   * stickyTop — sticky top offset for the Navbar (px)
   *
   * 正常情况返回 0（Navbar 贴顶）
   * Returns 0 normally (Navbar sticks to top)
   *
   * 当 top + sidebar + 面板展开时，返回面板高度（Navbar 紧贴面板底部）
   * When top+sidebar+panel-open, returns panel height (Navbar sticks below panel)
   *
   * 当 top + sidebar + 面板折叠时，返回 CLOSED_TAB_PX（留出 tab 占位）
   * When top+sidebar+panel-collapsed, returns CLOSED_TAB_PX (reserves tab space)
   */
  const stickyTop = useApiPanelNavbarTop();

  return (
    <header
      className="sticky z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 transition-[top] duration-200"
      style={{ top: stickyTop }}  // 动态 top，配合 top sidebar / Dynamic top for top sidebar compatibility
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo — 点击跳转到商品页 / Logo — click to go to product page */}
        <Link
          href={`/${locale}/product`}
          className="flex items-center gap-2 font-bold text-primary-600 dark:text-primary-400"
        >
          <Package size={20} />
          <span className="hidden sm:inline">ECS Demo</span>
        </Link>

        {/* 导航链接区 / Navigation links */}
        <nav className="flex items-center gap-1 text-sm font-medium">
          {/* 商品页 / Product page */}
          <Link
            href={`/${locale}/product`}
            className="px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors"
          >
            {t("product")}
          </Link>

          {/* 购物车页（含件数 Badge）/ Cart page (with item count badge) */}
          <Link
            href={`/${locale}/cart`}
            className="relative px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-1"
          >
            <ShoppingCart size={16} />
            {t("cart")}
            {/* Badge：仅在购物车有商品时显示 / Badge: only shown when cart has items */}
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {totalCount > 9 ? "9+" : totalCount}
              </span>
            )}
          </Link>

          {/* 结算页 / Checkout page */}
          <Link
            href={`/${locale}/checkout`}
            className="px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors"
          >
            {t("checkout")}
          </Link>
        </nav>

        {/* 右侧控件区：语言切换 + 主题切换 / Right controls: language switcher + theme toggle */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
