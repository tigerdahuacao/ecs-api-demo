"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Code2, Lightbulb, ArrowRight,
  PanelRight, PanelLeft, PanelTop, PanelBottom,
  Columns2, Rows2, Magnet,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
} from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";
import { useApiPanelStore, type ApiPanelMode, CLOSED_TAB_PX } from "@/store/api-panel";
import type { ApiPanelPosition } from "@/types";

// ─── Layout wrapper ───────────────────────────────────────────────────────────

/**
 * Wraps the entire locale layout. Computes how much space the sidebar panels
 * occupy and applies padding so the main content is never obscured.
 *
 * Sidebar offset rules (per direction):
 *   - mode="sidebar" AND any panel open  → paddingX = panel.size  (exact fit)
 *   - mode="sidebar" AND no panel open   → paddingX = CLOSED_TAB_PX (thin tab)
 *   - mode="float"                       → paddingX = 0
 */
export function ApiPanelProvider({ children }: { children: React.ReactNode }) {
  const configs = useApiPanelStore((s) => s.configs);
  const instances = useApiPanelStore((s) => s.instances);
  const global = useApiPanelStore((s) => s.global);
  const initFromStorage = useApiPanelStore((s) => s.initFromStorage);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  const hasRegistered = Object.keys(configs).length > 0;
  const offsets = { top: 0, bottom: 0, left: 0, right: 0 };

  if (global.mode === "sidebar" && hasRegistered) {
    const { position } = global;
    // Find the largest open panel's size
    const openSizes = Object.keys(configs)
      .map((id) => instances[id])
      .filter((inst) => inst?.isOpen)
      .map((inst) => inst!.size);

    if (openSizes.length > 0) {
      offsets[position] = Math.max(...openSizes);
    } else {
      // No open panel: reserve just enough for the closed tab
      offsets[position] = CLOSED_TAB_PX;
    }
  }

  return (
    <>
      {/* Content wrapper — padding keeps content clear of sidebar panels */}
      <div
        style={{
          paddingRight: offsets.right,
          paddingLeft: offsets.left,
          paddingTop: offsets.top,
          paddingBottom: offsets.bottom,
          transition: "padding 200ms ease",
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>

      {/* Render each registered panel's UI */}
      {Object.values(configs).map((config) => (
        <PanelUI key={config.id} id={config.id} />
      ))}
    </>
  );
}

// ─── Panel UI ─────────────────────────────────────────────────────────────────

type Tab = "request" | "response" | "suggestions" | "nextSteps";

const TAB_ICONS: Record<Tab, React.ElementType> = {
  request: Code2, response: Code2, suggestions: Lightbulb, nextSteps: ArrowRight,
};

const POSITION_ICONS: Record<ApiPanelPosition, React.ElementType> = {
  right: PanelRight, left: PanelLeft, top: PanelTop, bottom: PanelBottom,
};

// Chevron pointing "inward" to collapse the panel
const COLLAPSE_ICON: Record<ApiPanelPosition, React.ElementType> = {
  right: ChevronRight, left: ChevronLeft, top: ChevronUp, bottom: ChevronDown,
};

// Chevron pointing "outward" to expand from the closed tab
const EXPAND_ICON: Record<ApiPanelPosition, React.ElementType> = {
  right: ChevronLeft, left: ChevronRight, top: ChevronDown, bottom: ChevronUp,
};

function PanelUI({ id }: { id: string }) {
  const t = useTranslations("apiPanel");
  const [activeTab, setActiveTab] = useState<Tab>("request");

  const config = useApiPanelStore((s) => s.configs[id]);
  const entry = useApiPanelStore((s) => s.entries[id]);
  const instance = useApiPanelStore((s) => s.instances[id]);
  const global = useApiPanelStore((s) => s.global);
  const setOpen = useApiPanelStore((s) => s.setOpen);
  const setSize = useApiPanelStore((s) => s.setSize);
  const setGlobalPosition = useApiPanelStore((s) => s.setGlobalPosition);
  const setGlobalMode = useApiPanelStore((s) => s.setGlobalMode);

  const { position, mode } = global;
  const size = instance?.size ?? 360;
  const isOpen = instance?.isOpen ?? false;
  const isVertical = position === "left" || position === "right";

  // ── Resize drag (sidebar mode only) ────────────────────────────────────────
  const dragRef = useRef<{ start: number; size: number } | null>(null);

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = {
        start: isVertical ? e.clientX : e.clientY,
        size,
      };

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const current = isVertical ? ev.clientX : ev.clientY;
        const delta =
          position === "right" || position === "bottom"
            ? dragRef.current.start - current
            : current - dragRef.current.start;
        const min = isVertical ? 240 : 140;
        const max = isVertical ? 720 : 500;
        setSize(id, Math.max(min, Math.min(max, dragRef.current.size + delta)));
      };

      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [id, position, size, isVertical, setSize]
  );

  if (!config) return null;

  const CollapseIcon = COLLAPSE_ICON[position];
  const ExpandIcon = EXPAND_ICON[position];

  const renderContent = () => {
    if (activeTab === "suggestions") {
      return (
        <pre className="text-xs leading-relaxed whitespace-pre-wrap text-gray-300">
          {config.suggestions ?? t("noData")}
        </pre>
      );
    }
    if (activeTab === "nextSteps") {
      return (
        <pre className="text-xs leading-relaxed whitespace-pre-wrap text-gray-300">
          {config.nextSteps ?? t("noData")}
        </pre>
      );
    }
    const raw = activeTab === "request" ? entry?.request : entry?.response;
    if (!raw) return <p className="text-xs text-gray-500 italic">{t("noData")}</p>;
    return (
      <pre className="text-xs font-mono leading-relaxed text-green-400 whitespace-pre">
        {JSON.stringify(raw, null, 2)}
      </pre>
    );
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "request", label: t("request") },
    { key: "response", label: t("response") },
    { key: "suggestions", label: t("suggestions") },
    { key: "nextSteps", label: t("nextSteps") },
  ];

  // ── Toolbar (shared between modes) ─────────────────────────────────────────
  const toolbar = (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-700 bg-gray-800 shrink-0 flex-wrap">
      <span className="text-[10px] font-semibold text-primary-400 truncate flex-1 min-w-0">
        {config.title}
      </span>

      {/* Position picker — updates global position */}
      <div className="flex items-center gap-0.5 bg-gray-700 rounded p-0.5" title="Dock position">
        {(["left", "bottom", "right", "top"] as ApiPanelPosition[]).map((pos) => {
          const Icon = POSITION_ICONS[pos];
          return (
            <button
              key={pos}
              onClick={() => setGlobalPosition(pos)}
              className={`p-1 rounded transition-colors ${
                pos === position
                  ? "bg-primary-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-600"
              }`}
              title={`Dock ${pos}`}
            >
              <Icon size={13} />
            </button>
          );
        })}
      </div>

      {/* Mode toggle — updates global mode */}
      <div className="flex items-center gap-0.5 bg-gray-700 rounded p-0.5" title="Panel mode">
        <button
          onClick={() => setGlobalMode("float")}
          className={`flex items-center px-1.5 py-1 rounded text-[10px] transition-colors ${
            mode === "float"
              ? "bg-primary-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-600"
          }`}
          title="Float overlay"
        >
          <Magnet size={12} />
        </button>
        <button
          onClick={() => setGlobalMode("sidebar")}
          className={`flex items-center px-1.5 py-1 rounded text-[10px] transition-colors ${
            mode === "sidebar"
              ? "bg-primary-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-600"
          }`}
          title="Sidebar (push content)"
        >
          {isVertical ? <Columns2 size={12} /> : <Rows2 size={12} />}
        </button>
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setOpen(id, false)}
        className="p-1 text-gray-500 hover:text-white transition-colors rounded"
        aria-label="Collapse panel"
      >
        <CollapseIcon size={13} />
      </button>
    </div>
  );

  // ── Tab bar ────────────────────────────────────────────────────────────────
  const tabBar = (
    <div className="border-b border-gray-700 shrink-0">
      <OverlayScrollbarsComponent
        options={{
          scrollbars: {
            theme: "os-theme-dark",
            autoHide: "scroll",
            autoHideDelay: 600,
          },
          overflow: { x: "scroll", y: "hidden" },
        }}
        defer
      >
        <div className="flex">
          {tabs.map(({ key, label }) => {
            const Icon = TAB_ICONS[key];
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1 px-3 py-1.5 text-[11px] whitespace-nowrap transition-colors ${
                  activeTab === key
                    ? "text-primary-400 border-b-2 border-primary-400 -mb-px bg-gray-900"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <Icon size={11} />
                {label}
              </button>
            );
          })}
          {entry?.timestamp && (
            <span className="ml-auto px-3 py-1.5 text-[10px] text-gray-600 self-center">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
      </OverlayScrollbarsComponent>
    </div>
  );

  // ── SIDEBAR MODE ──────────────────────────────────────────────────────────
  if (mode === "sidebar") {
    // Precise fixed-position styles so panel occupies exactly `size` px
    const sidebarStyle: Record<ApiPanelPosition, React.CSSProperties> = {
      right:  { position: "fixed", right: 0, top: 0, width: size, height: "100%", zIndex: 50 },
      left:   { position: "fixed", left: 0, top: 0, width: size, height: "100%", zIndex: 50 },
      bottom: { position: "fixed", bottom: 0, left: 0, width: "100%", height: size, zIndex: 50 },
      top:    { position: "fixed", top: 0, left: 0, width: "100%", height: size, zIndex: 50 },
    };

    const closedTabStyle: Record<ApiPanelPosition, React.CSSProperties> = {
      right:  { position: "fixed", right: 0, top: 0, width: CLOSED_TAB_PX, height: "100%", zIndex: 50 },
      left:   { position: "fixed", left: 0, top: 0, width: CLOSED_TAB_PX, height: "100%", zIndex: 50 },
      bottom: { position: "fixed", bottom: 0, left: 0, width: "100%", height: CLOSED_TAB_PX, zIndex: 50 },
      top:    { position: "fixed", top: 0, left: 0, width: "100%", height: CLOSED_TAB_PX, zIndex: 50 },
    };

    // Resize handle at inner edge
    const resizeHandleStyle: Record<ApiPanelPosition, React.CSSProperties> = {
      right:  { position: "absolute", left: 0, top: 0, width: 4, height: "100%", cursor: "col-resize" },
      left:   { position: "absolute", right: 0, top: 0, width: 4, height: "100%", cursor: "col-resize" },
      bottom: { position: "absolute", top: 0, left: 0, width: "100%", height: 4, cursor: "row-resize" },
      top:    { position: "absolute", bottom: 0, left: 0, width: "100%", height: 4, cursor: "row-resize" },
    };

    if (!isOpen) {
      // Closed: just the thin tab
      return (
        <div
          style={closedTabStyle[position]}
          className="bg-primary-600 hover:bg-primary-700 flex items-center justify-center cursor-pointer transition-colors"
          onClick={() => setOpen(id, true)}
          role="button"
          tabIndex={0}
          aria-label="Open API panel"
          onKeyDown={(e) => e.key === "Enter" && setOpen(id, true)}
        >
          <ExpandIcon size={14} className="text-white" />
        </div>
      );
    }

    // Border class on the inner edge only
    const borderCls =
      position === "right"  ? "border-l border-gray-700" :
      position === "left"   ? "border-r border-gray-700" :
      position === "bottom" ? "border-t border-gray-700" : "border-b border-gray-700";

    // Open: full sidebar panel
    return (
      <div
        style={sidebarStyle[position]}
        className={`bg-gray-900 flex flex-col shadow-2xl overflow-hidden ${borderCls}`}
      >
        {/* Resize handle (inner edge) */}
        <div
          style={resizeHandleStyle[position]}
          className="hover:bg-primary-400 bg-gray-700 transition-colors z-10"
          onMouseDown={onResizeMouseDown}
          title="Drag to resize"
        />

        {toolbar}
        {tabBar}
        <OverlayScrollbarsComponent
          className="flex-1"
          options={{
            scrollbars: {
              theme: "os-theme-dark",
              autoHide: "scroll",
              autoHideDelay: 800,
            },
          }}
          defer
        >
          <div className="p-3">{renderContent()}</div>
        </OverlayScrollbarsComponent>
      </div>
    );
  }

  // ── FLOAT MODE ────────────────────────────────────────────────────────────
  // External toggle tab + overlaying panel body (never pushes content)
  const floatWrapCls: Record<ApiPanelPosition, string> = {
    right:  "fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-row-reverse",
    left:   "fixed left-0 top-1/2 -translate-y-1/2 z-50 flex flex-row",
    bottom: "fixed bottom-0 left-1/2 -translate-x-1/2 z-50 flex flex-col-reverse",
    top:    "fixed top-0 left-1/2 -translate-x-1/2 z-50 flex flex-col",
  };

  const floatToggleCls: Record<ApiPanelPosition, string> = {
    right:  "flex flex-col items-center justify-center gap-1 bg-primary-600 hover:bg-primary-700 text-white px-1.5 py-4 rounded-l-lg shadow-xl cursor-pointer shrink-0",
    left:   "flex flex-col items-center justify-center gap-1 bg-primary-600 hover:bg-primary-700 text-white px-1.5 py-4 rounded-r-lg shadow-xl cursor-pointer shrink-0",
    bottom: "flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white py-1.5 px-6 rounded-t-lg shadow-xl cursor-pointer shrink-0",
    top:    "flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white py-1.5 px-6 rounded-b-lg shadow-xl cursor-pointer shrink-0",
  };

  const floatPanelStyle: React.CSSProperties = isVertical
    ? { width: 360, height: "min(80vh, 600px)" }
    : { height: 280, width: "min(720px, 95vw)" };

  return (
    <div className={floatWrapCls[position]}>
      {/* Toggle tab */}
      <div
        className={floatToggleCls[position]}
        onClick={() => setOpen(id, !isOpen)}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onKeyDown={(e) => e.key === "Enter" && setOpen(id, !isOpen)}
      >
        <span
          className={`text-[10px] font-bold tracking-wider select-none ${
            isVertical ? "[writing-mode:vertical-rl] rotate-180" : ""
          }`}
        >
          API
        </span>
      </div>

      {/* Panel body */}
      {isOpen && (
        <div
          className="bg-gray-900 border border-gray-700 flex flex-col shadow-2xl overflow-hidden"
          style={floatPanelStyle}
        >
          {toolbar}
          {tabBar}
          <OverlayScrollbarsComponent
          className="flex-1"
          options={{
            scrollbars: {
              theme: "os-theme-dark",
              autoHide: "scroll",
              autoHideDelay: 800,
            },
          }}
          defer
        >
          <div className="p-3">{renderContent()}</div>
        </OverlayScrollbarsComponent>
        </div>
      )}
    </div>
  );
}
