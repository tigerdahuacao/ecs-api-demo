/**
 * @file src/components/common/ThemeToggle.tsx
 * 深色/浅色主题切换按钮 / Dark/light theme toggle button
 *
 * 作用 / Purpose:
 *   点击后在深色和浅色主题之间切换，同时：
 *   1. 修改 <html> 元素的 "dark" class（Tailwind CSS 的 darkMode: 'class' 策略）
 *   2. 将选择持久化到 localStorage（"theme" key），供下次访问时恢复
 *
 *   Toggles between dark and light themes on click, simultaneously:
 *   1. Toggling the "dark" class on <html> (Tailwind's darkMode: 'class' strategy)
 *   2. Persisting the choice to localStorage ("theme" key) for the next visit
 *
 * 与防闪烁脚本的配合 / Works with the anti-flash script:
 *   src/app/[locale]/layout.tsx 的 <head> 内有内联脚本，在页面渲染前读取 localStorage
 *   并立即设置 "dark" class，避免主题闪烁（FOUC）。
 *   The inline script in layout.tsx <head> reads localStorage before render
 *   and sets the "dark" class immediately, preventing theme flash (FOUC).
 *
 * 被引用于 / Imported by: src/components/common/Navbar.tsx
 */
"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * ThemeToggle — 主题切换按钮组件
 * ThemeToggle — theme toggle button component
 *
 * 无 props / No props
 *
 * 状态 / State:
 *   isDark — 当前是否为深色主题 / Whether dark theme is currently active
 */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  /**
   * 在客户端挂载时，从 localStorage 和系统偏好中读取主题状态
   * On client mount, read theme state from localStorage and system preference
   *
   * 为什么在 useEffect 中而非 useState 初始值？/ Why in useEffect rather than useState initializer?
   *   useState 的初始值在 SSR 时也执行，但 localStorage 和 matchMedia 只在浏览器存在，
   *   直接访问会导致 SSR 报错。useEffect 仅在客户端运行，是安全的。
   *   useState initializer runs during SSR too, but localStorage and matchMedia
   *   only exist in browsers. useEffect only runs on the client — safe.
   */
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = saved === "dark" || (!saved && prefersDark);
    // 同步 DOM 状态（避免 React state 与实际 class 不一致）
    // Sync DOM state (prevents React state from diverging from actual class)
    document.documentElement.classList.toggle("dark", dark);
    setIsDark(dark); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  /**
   * toggle — 切换主题
   * toggle — switch theme
   *
   * 1. 翻转 isDark state
   * 2. 更新 <html> 的 "dark" class
   * 3. 写入 localStorage
   */
  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* 深色时显示太阳（切回亮色），亮色时显示月亮（切入暗色）*/}
      {/* Show Sun when dark (switch to light), Moon when light (switch to dark) */}
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
