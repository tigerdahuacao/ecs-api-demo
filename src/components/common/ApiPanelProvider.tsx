"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Code2, Lightbulb, ArrowRight,
  PanelRight, PanelLeft, PanelTop, PanelBottom,
  Columns2, Rows2, Magnet, X,
} from "lucide-react";
import { useApiPanelStore, type ApiPanelMode } from "@/store/api-panel";
import type { ApiPanelPosition } from "@/types";

// ─── Layout wrapper ──────────────────────────────────────────────────────────

/**
 * Wraps the whole layout. Applies padding so content is never hidden behind
 * a sidebar-mode panel. Renders all registered panel UIs at the end.
 */
export function ApiPanelProvider({ children }: { children: React.ReactNode }) {
  const configs = useApiPanelStore((s) => s.configs);
  const settings = useApiPanelStore((s) => s.settings);
  const initFromStorage = useApiPanelStore((s) => s.initFromStorage);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  // Compute total sidebar offsets for each direction
  const offsets = { top: 0, bottom: 0, left: 0, right: 0 };
  for (const id of Object.keys(configs)) {
    const s = settings[id];
    if (s?.mode === "sidebar" && s.isOpen) {
      offsets[s.position] += s.size;
    }
  }

  return (
    <>
      {/* Content area that shrinks away from sidebar panels */}
      <div
        style={{
          paddingRight: offsets.right,
          paddingLeft: offsets.left,
          paddingTop: offsets.top,
          paddingBottom: offsets.bottom,
          transition: "padding 200ms ease",
        }}
      >
        {children}
      </div>

      {/* Render every registered panel's UI */}
      {Object.values(configs).map((config) => (
        <PanelUI key={config.id} id={config.id} />
      ))}
    </>
  );
}

// ─── Single panel UI ─────────────────────────────────────────────────────────

type Tab = "request" | "response" | "suggestions" | "nextSteps";

const TAB_ICONS: Record<Tab, React.ElementType> = {
  request: Code2, response: Code2, suggestions: Lightbulb, nextSteps: ArrowRight,
};

const POSITION_ICONS: Record<ApiPanelPosition, React.ElementType> = {
  right: PanelRight, left: PanelLeft, top: PanelTop, bottom: PanelBottom,
};

function PanelUI({ id }: { id: string }) {
  const t = useTranslations("apiPanel");
  const [activeTab, setActiveTab] = useState<Tab>("request");

  const config = useApiPanelStore((s) => s.configs[id]);
  const entry = useApiPanelStore((s) => s.entries[id]);
  const storeSettings = useApiPanelStore((s) => s.settings[id]);
  const setOpen = useApiPanelStore((s) => s.setOpen);
  const setPosition = useApiPanelStore((s) => s.setPosition);
  const setMode = useApiPanelStore((s) => s.setMode);
  const setSize = useApiPanelStore((s) => s.setSize);

  // Use store settings (already initialised by registerPanel + initFromStorage)
  const position: ApiPanelPosition = storeSettings?.position ?? config?.defaultPosition ?? "right";
  const mode: ApiPanelMode = storeSettings?.mode ?? "float";
  const size: number = storeSettings?.size ?? 360;
  const isOpen: boolean = storeSettings?.isOpen ?? false;

  const isVertical = position === "left" || position === "right";

  // ── Resize drag ────────────────────────────────────────────────────────────
  const dragStart = useRef<{ clientX: number; clientY: number; size: number } | null>(null);

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragStart.current = { clientX: e.clientX, clientY: e.clientY, size };

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragStart.current) return;
        let delta = 0;
        if (position === "right")  delta = dragStart.current.clientX - ev.clientX;
        if (position === "left")   delta = ev.clientX - dragStart.current.clientX;
        if (position === "bottom") delta = dragStart.current.clientY - ev.clientY;
        if (position === "top")    delta = ev.clientY - dragStart.current.clientY;
        const min = isVertical ? 240 : 140;
        const max = isVertical ? 700 : 500;
        setSize(id, Math.max(min, Math.min(max, dragStart.current.size + delta)));
      };

      const onMouseUp = () => {
        dragStart.current = null;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [id, position, size, isVertical, setSize]
  );

  // ── Position / mode handlers (immediate CSS effect via Zustand) ────────────
  const handlePosition = (pos: ApiPanelPosition) => setPosition(id, pos);
  const handleMode = (m: ApiPanelMode) => setMode(id, m);

  if (!config) return null;

  // ── Float mode: small overlay toggle tab ──────────────────────────────────
  const floatWrapCls: Record<ApiPanelPosition, string> = {
    right:  "fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-row-reverse",
    left:   "fixed left-0 top-1/2 -translate-y-1/2 z-50 flex flex-row",
    bottom: "fixed bottom-0 left-1/2 -translate-x-1/2 z-50 flex flex-col-reverse",
    top:    "fixed top-0 left-1/2 -translate-x-1/2 z-50 flex flex-col",
  };

  // ── Sidebar mode: full-edge panel ─────────────────────────────────────────
  const sidebarWrapCls: Record<ApiPanelPosition, string> = {
    right:  "fixed right-0 top-0 h-full z-50 flex flex-row-reverse",
    left:   "fixed left-0 top-0 h-full z-50 flex flex-row",
    bottom: "fixed bottom-0 left-0 w-full z-50 flex flex-col-reverse",
    top:    "fixed top-0 left-0 w-full z-50 flex flex-col",
  };

  const toggleBtnCls: Record<ApiPanelPosition, string> = {
    right:  "flex flex-col items-center justify-center gap-1 bg-primary-600 hover:bg-primary-700 text-white px-1.5 py-4 rounded-l-lg shadow-xl cursor-pointer shrink-0",
    left:   "flex flex-col items-center justify-center gap-1 bg-primary-600 hover:bg-primary-700 text-white px-1.5 py-4 rounded-r-lg shadow-xl cursor-pointer shrink-0",
    bottom: "flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white py-1.5 px-6 rounded-t-lg shadow-xl cursor-pointer shrink-0",
    top:    "flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white py-1.5 px-6 rounded-b-lg shadow-xl cursor-pointer shrink-0",
  };

  // Panel body dimensions
  const panelStyle: React.CSSProperties = isVertical
    ? { width: size, height: mode === "sidebar" ? "100%" : "min(80vh, 600px)" }
    : { height: size, width: mode === "sidebar" ? "100%" : "min(720px, 95vw)" };

  const wrapCls = mode === "sidebar" ? sidebarWrapCls[position] : floatWrapCls[position];

  // Resize handle placement (inner edge of panel)
  const resizeHandleCls: Record<ApiPanelPosition, string> = {
    right:  "absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary-400 bg-gray-700 transition-colors",
    left:   "absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary-400 bg-gray-700 transition-colors",
    bottom: "absolute top-0 left-0 w-full h-1 cursor-row-resize hover:bg-primary-400 bg-gray-700 transition-colors",
    top:    "absolute bottom-0 left-0 w-full h-1 cursor-row-resize hover:bg-primary-400 bg-gray-700 transition-colors",
  };

  const renderContent = () => {
    if (activeTab === "suggestions") {
      return <pre className="text-xs leading-relaxed whitespace-pre-wrap text-gray-300">{config.suggestions ?? t("noData")}</pre>;
    }
    if (activeTab === "nextSteps") {
      return <pre className="text-xs leading-relaxed whitespace-pre-wrap text-gray-300">{config.nextSteps ?? t("noData")}</pre>;
    }
    const raw = activeTab === "request" ? entry?.request : entry?.response;
    if (!raw) return <p className="text-xs text-gray-500 italic">{t("noData")}</p>;
    return (
      <pre className="text-xs font-mono leading-relaxed text-green-400 overflow-auto">
        {JSON.stringify(raw, null, 2)}
      </pre>
    );
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "request",     label: t("request") },
    { key: "response",    label: t("response") },
    { key: "suggestions", label: t("suggestions") },
    { key: "nextSteps",   label: t("nextSteps") },
  ];

  return (
    <div className={wrapCls}>
      {/* Toggle button (always visible) */}
      <div
        className={toggleBtnCls[position]}
        onClick={() => setOpen(id, !isOpen)}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onKeyDown={(e) => e.key === "Enter" && setOpen(id, !isOpen)}
      >
        <span className={`text-[10px] font-bold tracking-wider select-none ${isVertical ? "[writing-mode:vertical-rl] rotate-180" : ""}`}>
          API
        </span>
      </div>

      {/* Panel body */}
      {isOpen && (
        <div
          className="bg-gray-900 border border-gray-700 flex flex-col shadow-2xl overflow-hidden relative"
          style={panelStyle}
        >
          {/* Resize handle (sidebar mode only) */}
          {mode === "sidebar" && (
            <div
              className={resizeHandleCls[position]}
              onMouseDown={onResizeMouseDown}
              title="Drag to resize"
            />
          )}

          {/* ── Toolbar ── */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-700 bg-gray-800 shrink-0 flex-wrap">
            <span className="text-[10px] font-semibold text-primary-400 truncate flex-1 min-w-0">
              {config.title}
            </span>

            {/* Position picker */}
            <div className="flex items-center gap-0.5 bg-gray-700 rounded p-0.5" title="Dock position">
              {(["left", "bottom", "right", "top"] as ApiPanelPosition[]).map((pos) => {
                const Icon = POSITION_ICONS[pos];
                return (
                  <button
                    key={pos}
                    onClick={() => handlePosition(pos)}
                    className={`p-1 rounded transition-colors ${
                      pos === position
                        ? "bg-primary-600 text-white"
                        : "text-gray-400 hover:text-white hover:bg-gray-600"
                    }`}
                    title={`Dock ${pos}`}
                    aria-label={`Dock ${pos}`}
                  >
                    <Icon size={13} />
                  </button>
                );
              })}
            </div>

            {/* Mode toggle */}
            <div className="flex items-center gap-0.5 bg-gray-700 rounded p-0.5" title="Display mode">
              <button
                onClick={() => handleMode("float")}
                className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] transition-colors ${
                  mode === "float"
                    ? "bg-primary-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-600"
                }`}
                title="Float overlay"
              >
                <Magnet size={12} />
              </button>
              <button
                onClick={() => handleMode("sidebar")}
                className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] transition-colors ${
                  mode === "sidebar"
                    ? "bg-primary-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-600"
                }`}
                title="Sidebar (push content)"
              >
                {isVertical ? <Columns2 size={12} /> : <Rows2 size={12} />}
              </button>
            </div>

            {/* Close */}
            <button
              onClick={() => setOpen(id, false)}
              className="p-1 text-gray-500 hover:text-white transition-colors rounded"
              aria-label="Close panel"
            >
              <X size={13} />
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-gray-700 shrink-0 overflow-x-auto">
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

          {/* ── Content ── */}
          <div className="flex-1 overflow-auto p-3">{renderContent()}</div>
        </div>
      )}
    </div>
  );
}
