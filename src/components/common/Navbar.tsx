"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ShoppingCart, Package } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useCartStore } from "@/store/cart";
import { useApiPanelNavbarTop } from "@/store/api-panel";

export function Navbar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const totalCount = useCartStore((s) => s.totalCount());

  // When a "top" sidebar panel is active, the Navbar must stick below it.
  // Otherwise sticky top-0 would scroll the Navbar behind the fixed panel.
  const stickyTop = useApiPanelNavbarTop();

  return (
    <header
      className="sticky z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 transition-[top] duration-200"
      style={{ top: stickyTop }}
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href={`/${locale}/product`}
          className="flex items-center gap-2 font-bold text-primary-600 dark:text-primary-400"
        >
          <Package size={20} />
          <span className="hidden sm:inline">ECS Demo</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link
            href={`/${locale}/product`}
            className="px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors"
          >
            {t("product")}
          </Link>
          <Link
            href={`/${locale}/cart`}
            className="relative px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-1"
          >
            <ShoppingCart size={16} />
            {t("cart")}
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {totalCount > 9 ? "9+" : totalCount}
              </span>
            )}
          </Link>
          <Link
            href={`/${locale}/checkout`}
            className="px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors"
          >
            {t("checkout")}
          </Link>
        </nav>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
