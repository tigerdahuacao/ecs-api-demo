/**
 * @file src/hooks/useContainerWidth.ts
 * ResizeObserver hook：测量容器元素的实际宽度
 * ResizeObserver hook: measures the actual width of a container element
 *
 * 作用 / Purpose:
 *   通过 ref 绑定到任意 DOM 元素，在容器尺寸变化时实时更新宽度。
 *   用于实现基于容器宽度（而非视口宽度）的响应式布局切换。
 *
 *   Binds to any DOM element via ref and updates width on resize.
 *   Used for container-width-based (not viewport-based) responsive layout switching.
 *
 * 被引用于 / Imported by:
 *   src/components/checkout/PaymentWall.tsx
 *
 * @example
 * ```tsx
 * const { ref, width } = useContainerWidth();
 * return <div ref={ref}>{width < 300 ? <RadioLayout /> : <TabLayout />}</div>;
 * ```
 */
"use client";

import { useRef, useState, useEffect } from "react";

/**
 * useContainerWidth — 实时测量容器宽度
 * useContainerWidth — measure container width in real time
 *
 * @returns {Object}
 *   - ref: React ref，绑定到需要测量的容器元素 / bind to the container element
 *   - width: number，容器当前宽度（px），初始值 Infinity 避免 SSR 闪烁
 *            current width in px; initial value is Infinity to avoid SSR flicker
 */
export function useContainerWidth<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  // 初始值 Infinity：SSR 和首次渲染时默认宽屏布局，避免闪烁
  // Initial Infinity: default to wide layout during SSR/first render to avoid flicker
  const [width, setWidth] = useState(Infinity);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 立即读取初始尺寸 / Read initial size immediately
    setWidth(el.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
