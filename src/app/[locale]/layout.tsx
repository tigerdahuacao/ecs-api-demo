/**
 * @file src/app/[locale]/layout.tsx
 * 带语言前缀的根布局 / Locale-aware root layout
 *
 * 作用 / Purpose:
 *   这是整个应用最外层的布局组件，承担以下职责：
 *   1. 生成完整的 HTML 结构（<html lang>、<head>、<body>）
 *   2. 注入主题防闪烁脚本（在 React 水合前从 localStorage 读取 dark/light 设置）
 *   3. 提供 next-intl 的 Client Provider（将服务端加载的翻译消息注入客户端）
 *   4. 渲染 <CartInitializer>（从 sessionStorage 恢复购物车状态）
 *   5. 渲染 <ApiPanelProvider>（管理 ApiPanel 的 padding 偏移和面板 UI 渲染）
 *   6. 渲染 <Navbar>（顶部导航栏）
 *   7. 包裹 <main> 内容区域（子页面在此注入）
 *
 *   This is the outermost layout component, responsible for:
 *   1. Generating the full HTML structure (html, head, body)
 *   2. Injecting the anti-flash theme script (reads dark/light from localStorage before React hydrates)
 *   3. Providing the next-intl Client Provider (injects server-loaded translations into the client)
 *   4. Rendering <CartInitializer> (restores cart state from sessionStorage)
 *   5. Rendering <ApiPanelProvider> (manages ApiPanel padding offsets and panel UI rendering)
 *   6. Rendering <Navbar> (top navigation bar)
 *   7. Wrapping the <main> content area (child pages are injected here)
 *
 * 渲染层次 / Render hierarchy:
 *   LocaleLayout
 *   └── NextIntlClientProvider
 *       ├── CartInitializer        ← 初始化购物车（无 UI）
 *       └── ApiPanelProvider       ← 管理侧边栏偏移 + 渲染所有面板 UI
 *           ├── Navbar             ← 顶部导航
 *           └── main               ← 子页面（ProductPage / CartPage / CheckoutPage）
 *               └── {children}
 *
 * 被引用于 / Used by: Next.js App Router 自动应用于 /[locale]/* 路由
 */
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Navbar } from "@/components/common/Navbar";
import { CartInitializer } from "@/components/common/CartInitializer";
import { ApiPanelProvider } from "@/components/common/ApiPanelProvider";
import "../globals.css";

export const metadata: Metadata = {
  title: "ECS Demo — E-Commerce Payment Playground",
  description: "Full-stack e-commerce payment API demo",
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  /** Next.js 动态路由参数（异步）/ Next.js dynamic route params (async) */
  params: Promise<{ locale: string }>;
}

/**
 * LocaleLayout — 带语言前缀的根布局（服务端组件）
 * LocaleLayout — locale-aware root layout (Server Component)
 *
 * @param children 当前匹配的子页面 / Currently matched child page
 * @param params.locale 从 URL 提取的语言代码 / Locale code extracted from URL
 */
export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  // 若 locale 不在支持列表中，返回 404 / Return 404 if locale is not supported
  if (!routing.locales.includes(locale as "zh" | "en")) {
    notFound();
  }

  // 服务端加载翻译消息，注入 NextIntlClientProvider
  // Load translation messages server-side, inject into NextIntlClientProvider
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/*
         * 主题防闪烁内联脚本 / Anti-flash theme script
         *
         * 问题 / Problem:
         *   React 水合（hydration）是异步的，在 JS 加载完成前，
         *   页面可能短暂以亮色模式渲染（即使用户选择了暗色），造成闪烁（FOUC）。
         *   React hydration is async; before JS loads, the page may briefly render
         *   in light mode even if the user prefers dark, causing a flash (FOUC).
         *
         * 解决方案 / Solution:
         *   在 <head> 中内联一个同步脚本，在页面渲染前立即读取 localStorage，
         *   并将 "dark" class 添加到 <html> 元素，从而消除闪烁。
         *   Inline a synchronous script in <head> that reads localStorage before
         *   the page renders and adds the "dark" class to <html>, eliminating the flash.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('theme');
                const p = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (t === 'dark' || (!t && p)) document.documentElement.classList.add('dark');
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen">
        {/* next-intl Provider：将翻译消息注入所有客户端组件 / Injects translations into all client components */}
        <NextIntlClientProvider messages={messages}>
          {/* CartInitializer：从 sessionStorage 恢复购物车，无 UI / Restores cart from sessionStorage, no UI */}
          <CartInitializer />
          {/*
           * ApiPanelProvider：
           *   1. 在客户端 mount 后从 localStorage 恢复 ApiPanel 设置
           *   2. 根据 sidebar 模式计算 padding/height 偏移，推开页面内容
           *   3. 渲染所有已注册面板的 UI（PanelUI 组件）
           *
           * ApiPanelProvider:
           *   1. Restores ApiPanel settings from localStorage after client mount
           *   2. Computes padding/height offsets for sidebar mode, pushing content aside
           *   3. Renders UI for all registered panels (PanelUI components)
           */}
          <ApiPanelProvider>
            {/* 顶部导航栏，sticky 定位，top 值由 useApiPanelNavbarTop() 动态计算 */}
            {/* Top navigation bar, sticky positioned; top value dynamically computed */}
            <Navbar />
            <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
          </ApiPanelProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
