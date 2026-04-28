/**
 * @file src/components/common/LanguageSwitcher.tsx
 * 语言切换器 / Language switcher
 *
 * 作用 / Purpose:
 *   在 Navbar 中展示语言切换按钮（中文 / EN）。
 *   点击后保持当前页面路径不变，仅替换 URL 中的语言前缀段。
 *
 *   Displays language switch buttons (中文 / EN) in the Navbar.
 *   On click, keeps the current page path unchanged and only replaces
 *   the locale segment in the URL.
 *
 * 示例 / Example:
 *   当前 URL: /zh/cart → 点击 EN → 跳转 /en/cart
 *   Current URL: /zh/cart → click EN → navigates to /en/cart
 *
 * 被引用于 / Imported by: src/components/common/Navbar.tsx
 */
"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Globe } from "lucide-react";

/**
 * 各语言代码对应的按钮标签文本 / Button label text for each locale code
 */
const LOCALE_LABELS: Record<string, string> = {
  zh: "中文",
  en: "EN",
};

/**
 * LanguageSwitcher — 语言切换器组件
 * LanguageSwitcher — language switcher component
 *
 * 无 props / No props
 *
 * 工作原理 / How it works:
 *   1. 读取当前 pathname（含语言前缀，如 /zh/cart）
 *   2. 按 "/" 拆分为数组：["", "zh", "cart"]
 *   3. 将 index 1（语言段）替换为目标语言
 *   4. 重新拼接并 router.push()
 */
export function LanguageSwitcher() {
  const locale = useLocale();        // 当前语言代码 / Current locale code
  const pathname = usePathname();    // 当前完整路径 / Current full path
  const router = useRouter();

  /**
   * switchLocale — 切换到指定语言
   * switchLocale — switch to the specified locale
   *
   * @param next 目标语言代码（"zh" 或 "en"）/ Target locale code ("zh" or "en")
   */
  const switchLocale = (next: string) => {
    // 替换路径中的语言前缀段 / Replace the locale segment in the path
    const segments = pathname.split("/");
    segments[1] = next;              // index 0 是空字符串，index 1 是语言段 / index 0 is "", index 1 is locale
    router.push(segments.join("/"));
    // 持久化到 localStorage（供其他地方读取，非 next-intl 核心机制）
    // Persist to localStorage (for reference; not part of next-intl core mechanism)
    localStorage.setItem("locale", next);
  };

  return (
    <div className="flex items-center gap-1">
      <Globe size={16} className="text-gray-400" aria-hidden />
      {/* 遍历 routing.locales 动态生成按钮，新增语言只需改 routing.ts */}
      {/* Dynamically generates buttons from routing.locales; adding a language just requires updating routing.ts */}
      {routing.locales.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
            l === locale
              ? "bg-primary-500 text-white"      // 当前语言高亮 / Highlight current locale
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          aria-current={l === locale ? "true" : undefined}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
