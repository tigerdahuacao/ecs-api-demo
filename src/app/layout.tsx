/**
 * @file src/app/layout.tsx
 * Next.js App Router 根布局 / Next.js App Router root layout
 *
 * 作用 / Purpose:
 *   App Router 要求根路由必须存在 layout.tsx。
 *   本项目的实际 HTML 结构（<html>、<body>、主题、i18n）都在
 *   src/app/[locale]/layout.tsx 中定义，因此这里只是一个透传包装。
 *
 *   App Router requires a layout.tsx at the root route.
 *   The actual HTML structure (html, body, theme, i18n) is defined in
 *   src/app/[locale]/layout.tsx, so this is just a pass-through wrapper.
 *
 * 被引用于 / Used by: Next.js 内部机制，无需手动引用 / Next.js internals; no manual import needed
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
