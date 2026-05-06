/**
 * @file src/components/common/ApiPanel.tsx
 * ApiPanel 注册组件（页面级）/ ApiPanel registration component (page-level)
 *
 * 作用 / Purpose:
 *   此组件是一个"纯注册器"——它本身不渲染任何可见 UI，
 *   只是在挂载/卸载时通过 Zustand store 注册/注销面板配置。
 *   实际的面板 UI 由 src/components/common/ApiPanelProvider.tsx 中的 PanelUI 负责渲染。
 *
 *   This component is a "pure registrar" — it renders no visible UI.
 *   It only registers/unregisters the panel config via the Zustand store on mount/unmount.
 *   The actual panel UI is rendered by PanelUI inside ApiPanelProvider.tsx.
 *
 * 设计模式 / Design pattern:
 *   类似 Next.js 的 <title>/<meta> 标签模式（声明式 Portal 注册）：
 *   页面组件声明"我需要一个什么样的面板"，布局层负责渲染。
 *   Similar to Next.js <title>/<meta> portal pattern:
 *   page components declare "what panel they need"; the layout layer renders it.
 *
 * 使用方式 / Usage (in any page.tsx):
 *   <ApiPanel id="product-add-to-cart" title="POST /api/cart" defaultPosition="right" />
 *
 * 被引用于 / Imported by:
 *   - src/app/[locale]/product/page.tsx
 *   - src/app/[locale]/cart/page.tsx
 *   - src/app/[locale]/checkout/page.tsx
 */
"use client";

import { useEffect } from "react";
import { useApiPanelStore } from "@/store/api-panel";
import type { ApiPanelConfig } from "@/types";

/**
 * ApiPanel — 面板注册组件（无 UI）
 * ApiPanel — panel registration component (no UI)
 *
 * @param id 面板唯一 ID，必须全局唯一，apiFetch 通过此 ID 路由数据到正确面板
 *           Globally unique panel ID; apiFetch uses this to route data to the panel
 * @param title 面板工具栏显示的标题（通常是 API 路径描述）
 *              Title shown in panel toolbar (usually the API path description)
 * @param defaultPosition 初始停靠位置，会被 localStorage 中的用户设置覆盖
 *                        Initial dock position, overridden by user's localStorage setting
 * @param defaultOpen 是否在首次渲染时自动展开（目前未使用，预留）
 *                    Whether to auto-open on first render (reserved, not used yet)
 * @param suggestions "建议"标签页的静态文案 / Static text for the Suggestions tab
 * @param nextSteps "下一步"标签页的静态文案 / Static text for the Next Steps tab
 */
export function ApiPanel({
  id,
  title,
  defaultPosition = "right",
  suggestions,
  nextSteps,
  defaultRequest,
  defaultResponse,
}: ApiPanelConfig) {
  const registerPanel = useApiPanelStore((s) => s.registerPanel);
  const unregisterPanel = useApiPanelStore((s) => s.unregisterPanel);

  useEffect(() => {
    // 挂载时：将配置写入 Zustand store，ApiPanelProvider 据此渲染 PanelUI
    // On mount: write config to Zustand store; ApiPanelProvider renders PanelUI from it
    registerPanel({ id, title, defaultPosition: defaultPosition ?? "right", suggestions, nextSteps, defaultRequest, defaultResponse });

    // 卸载时：路由切换时从 store 移除配置，ApiPanelProvider 停止渲染该面板
    // On unmount (route change): remove config from store; ApiPanelProvider stops rendering this panel
    return () => unregisterPanel(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // 仅 id 变化时重新注册（正常情况下不会发生）/ Re-register only if id changes (normally never)

  // 不渲染任何可见 DOM / Renders no visible DOM
  return null;
}
