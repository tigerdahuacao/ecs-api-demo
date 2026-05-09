/**
 * @file src/app/[locale]/page.tsx
 * 语言根路由 / Locale root route
 *
 * 作用 / Purpose:
 *   访问 "/zh" 或 "/en" 时重定向到对应语言的商品页。
 *   Redirects "/zh" or "/en" to the product page for that locale.
 *
 * 示例 / Example:
 *   访问 /zh → 重定向到 /zh/product
 *   访问 /en → 重定向到 /en/product
 */
import { redirect } from "next/navigation";

export const runtime = 'edge';

interface Props {
  /** Next.js 动态路由参数（Promise，因为 App Router 异步化了 params）
   *  Next.js dynamic route params (Promise because App Router made params async) */
  params: Promise<{ locale: string }>;
}

/**
 * RootPage — 语言根路由页面，直接跳转到商品页
 * RootPage — locale root route page; redirects directly to the product page
 *
 * @param params.locale 当前语言代码（"zh" 或 "en"）/ Current locale code ("zh" or "en")
 */
export default async function RootPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/product`);
}
