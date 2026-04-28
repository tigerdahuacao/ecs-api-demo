/**
 * @file src/components/common/CartInitializer.tsx
 * 购物车状态初始化器 / Cart state initializer
 *
 * 作用 / Purpose:
 *   在客户端首次挂载时，从 sessionStorage 恢复购物车数据到 Zustand store。
 *   本组件不渲染任何 UI，仅作为"副作用触发器"使用。
 *
 *   Restores cart data from sessionStorage into the Zustand store
 *   on the first client mount. This component renders no UI — it only
 *   triggers a side effect.
 *
 * 为什么需要单独的组件？/ Why a separate component?
 *   initCartStore() 调用 sessionStorage，只能在客户端运行（SSR 时不可用）。
 *   通过 useEffect 延迟到浏览器端执行可以避免 SSR 报错。
 *   若直接在 store 创建时初始化，会在 SSR 阶段抛出 "sessionStorage is not defined" 错误。
 *
 *   initCartStore() calls sessionStorage, which only exists in the browser.
 *   Deferring via useEffect prevents SSR errors.
 *   Initializing directly in store creation would throw "sessionStorage is not defined" during SSR.
 *
 * 位置 / Placement:
 *   在 src/app/[locale]/layout.tsx 中渲染，位于 <ApiPanelProvider> 外部（兄弟节点），
 *   保证在所有子页面渲染前完成购物车状态的恢复。
 *   Rendered in src/app/[locale]/layout.tsx, outside <ApiPanelProvider> (as a sibling),
 *   ensuring cart state is restored before any child page renders.
 */
"use client";

import { useEffect } from "react";
import { initCartStore } from "@/store/cart";

/**
 * CartInitializer — 购物车状态初始化器（无 UI）
 * CartInitializer — cart state initializer (no UI)
 *
 * 无 props / No props
 * 返回 null（不渲染任何 DOM 元素）/ Returns null (renders no DOM elements)
 */
export function CartInitializer() {
  useEffect(() => {
    // 从 sessionStorage 恢复 sessionId 和 items 到 Zustand store
    // Restore sessionId and items from sessionStorage into the Zustand store
    initCartStore();
  }, []); // 空依赖：仅在首次客户端挂载时执行一次 / Empty deps: runs only once on first client mount

  return null;
}
