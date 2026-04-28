/**
 * @file src/app/page.tsx
 * 根路由页面 / Root route page
 *
 * 作用 / Purpose:
 *   访问 "/" 时立即重定向到中文版商品页。
 *   next-intl middleware 会处理 "/zh/product" → 最终目标页。
 *   Redirects "/" immediately to the Chinese product page.
 *   The next-intl middleware handles routing for "/zh/product".
 *
 * 注意 / Note:
 *   此文件存在是因为 Next.js App Router 要求根路径必须有一个 page.tsx。
 *   实际的带语言前缀的路由处理在 src/app/[locale]/ 目录下。
 *   This file exists because Next.js App Router requires a page.tsx at root.
 *   The actual locale-prefixed routing is handled under src/app/[locale]/.
 */
import { redirect } from "next/navigation";

/**
 * RootPage — 根路由页面，访问时直接跳转到默认语言的商品页
 * RootPage — root route page; immediately redirects to the default-locale product page
 *
 * 无 props，不渲染 UI / No props, renders no UI
 */
export default function RootPage() {
  redirect("/zh/product");
}
