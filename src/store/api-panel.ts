/**
 * @file src/store/api-panel.ts
 * ApiPanel 全局状态管理 / ApiPanel global state management
 *
 * 作用 / Purpose:
 *   管理页面上所有 ApiPanel 实例的状态，分为两个层次：
 *   1. 全局设置（position、mode）：所有面板共享，用户调整一个面板的位置/模式后，
 *      所有页面的面板都同步更新，并持久化到 localStorage。
 *   2. 实例状态（size、isOpen）：每个面板独立，按 panelId 存储，持久化到 localStorage。
 *
 *   Manages state for all ApiPanel instances on the page, in two layers:
 *   1. Global settings (position, mode): shared across all panels. Changing
 *      position/mode on one panel updates all panels and persists to localStorage.
 *   2. Instance state (size, isOpen): per-panel, keyed by panelId, also persisted.
 *
 * 被引用于 / Imported by:
 *   - src/components/common/ApiPanel.tsx（注册/注销面板）
 *   - src/components/common/ApiPanelProvider.tsx（读取状态渲染 UI）
 *   - src/components/common/Navbar.tsx（读取 top 偏移量）
 *   - src/lib/api-client.ts（写入 API 请求/响应数据）
 */
import { create } from "zustand";
import type { ApiPanelPosition } from "@/types";

/**
 * 侧边栏关闭时的折叠标签宽度（px）
 * Width of the collapsed tab when sidebar panel is closed (px)
 * 被 Navbar.tsx 和 ApiPanelProvider.tsx 共同引用，保持一致
 * Shared between Navbar.tsx and ApiPanelProvider.tsx to keep layout in sync
 */
export const CLOSED_TAB_PX = 24;

/**
 * 面板显示模式 / Panel display mode
 * float  — 悬浮覆盖，不影响页面布局 / Floating overlay, does not affect page layout
 * sidebar — 侧边栏，推开页面内容  / Sidebar, pushes page content aside
 */
export type ApiPanelMode = "float" | "sidebar";

/**
 * 一次 API 调用的请求/响应记录
 * One API call's request + response record
 * 被 apiFetch() 写入，被 PanelUI 读取展示
 * Written by apiFetch(), read and displayed by PanelUI
 */
export interface PanelDataEntry {
  request: unknown;
  response: unknown;
  timestamp: number;
}

/**
 * 全局面板设置（所有面板共享）/ Global panel settings (shared across all panels)
 * position: 面板停靠方向 / Dock direction
 * mode: float 还是 sidebar / float vs sidebar
 */
export interface GlobalPanelSettings {
  position: ApiPanelPosition;
  mode: ApiPanelMode;
}

/**
 * 单个面板的独立状态 / Per-panel instance state
 * size: 面板宽度（left/right）或高度（top/bottom），单位 px / Panel size in px
 * isOpen: 是否展开 / Whether panel is expanded
 */
export interface PanelInstanceState {
  size: number;
  isOpen: boolean;
}

/**
 * 面板配置（由 <ApiPanel> 组件在挂载时注册）
 * Panel config (registered by <ApiPanel> component on mount)
 */
export interface PanelConfig {
  id: string;
  title: string;
  defaultPosition: ApiPanelPosition;
  suggestions?: string;
  nextSteps?: string;
  defaultRequest?: unknown;
  defaultResponse?: unknown;
}

/** 面板默认尺寸（px）/ Default panel size (px) */
const DEFAULT_SIZE = 360;
/** localStorage 中全局设置的 key / localStorage key for global settings */
const GLOBAL_KEY = "ecs_api_panel_global";
/** localStorage 中各面板实例状态的 key / localStorage key for per-panel states */
const INSTANCE_KEY = "ecs_api_panel_instances";

/**
 * loadGlobal — 从 localStorage 读取全局面板设置
 * loadGlobal — read global panel settings from localStorage
 *
 * @returns 持久化的全局设置，或默认值 {position:"right", mode:"float"}
 *          Persisted global settings, or defaults
 */
function loadGlobal(): GlobalPanelSettings {
  if (typeof window === "undefined") return { position: "right", mode: "float" };
  try {
    return (
      (JSON.parse(localStorage.getItem(GLOBAL_KEY) ?? "null") as GlobalPanelSettings | null) ?? {
        position: "right",
        mode: "float",
      }
    );
  } catch {
    return { position: "right", mode: "float" };
  }
}

/**
 * saveGlobal — 将全局面板设置写入 localStorage
 * saveGlobal — write global panel settings to localStorage
 *
 * @param s 要持久化的全局设置 / Global settings to persist
 */
function saveGlobal(s: GlobalPanelSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GLOBAL_KEY, JSON.stringify(s));
}

/**
 * loadInstances — 从 localStorage 读取所有面板的实例状态
 * loadInstances — read all panel instance states from localStorage
 *
 * @returns 以 panelId 为 key 的实例状态 map / Map of instance states keyed by panelId
 */
function loadInstances(): Record<string, PanelInstanceState> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(INSTANCE_KEY) ?? "{}") as Record<
      string,
      PanelInstanceState
    >;
  } catch {
    return {};
  }
}

/**
 * saveInstances — 将所有面板实例状态写入 localStorage
 * saveInstances — write all panel instance states to localStorage
 *
 * @param s 以 panelId 为 key 的实例状态 map / Map of instance states keyed by panelId
 */
function saveInstances(s: Record<string, PanelInstanceState>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(INSTANCE_KEY, JSON.stringify(s));
}

/**
 * ApiPanelStoreState — store 的完整状态类型定义
 * ApiPanelStoreState — full state type definition for the store
 */
interface ApiPanelStoreState {
  // ── 全局设置 / Global settings ──────────────────────────────────────────
  global: GlobalPanelSettings;

  /**
   * setGlobalPosition — 修改所有面板的停靠方向
   * setGlobalPosition — change dock position for all panels
   * 调用方 / Called by: PanelUI 工具栏中的位置选择按钮
   */
  setGlobalPosition: (position: ApiPanelPosition) => void;

  /**
   * setGlobalMode — 切换所有面板的显示模式（float ↔ sidebar）
   * setGlobalMode — toggle display mode for all panels (float ↔ sidebar)
   * 调用方 / Called by: PanelUI 工具栏中的模式切换按钮
   */
  setGlobalMode: (mode: ApiPanelMode) => void;

  // ── 实例状态 / Instance state ────────────────────────────────────────────
  instances: Record<string, PanelInstanceState>;

  /**
   * setOpen — 展开或折叠指定面板
   * setOpen — expand or collapse a specific panel
   * 调用方 / Called by: apiFetch()（自动展开）、PanelUI 的关闭按钮、侧边栏 tab 点击
   */
  setOpen: (id: string, isOpen: boolean) => void;

  /**
   * setSize — 设置面板尺寸（拖拽 resize 时调用）
   * setSize — set panel size (called during drag resize)
   * 调用方 / Called by: PanelUI 的 onResizeMouseDown handler
   */
  setSize: (id: string, size: number) => void;

  // ── API 数据条目 / API data entries ──────────────────────────────────────
  entries: Record<string, PanelDataEntry>;

  /**
   * setEntry — 写入一次 API 请求/响应记录
   * setEntry — write one API request/response record
   * 调用方 / Called by: src/lib/api-client.ts → apiFetch()
   */
  setEntry: (id: string, entry: PanelDataEntry) => void;

  // ── 面板配置注册 / Panel config registry ─────────────────────────────────
  configs: Record<string, PanelConfig>;

  /**
   * registerPanel — 注册一个面板（<ApiPanel> 挂载时调用）
   * registerPanel — register a panel (called when <ApiPanel> mounts)
   * 调用方 / Called by: src/components/common/ApiPanel.tsx → useEffect
   */
  registerPanel: (config: PanelConfig) => void;

  /**
   * unregisterPanel — 注销一个面板（<ApiPanel> 卸载时调用）
   * unregisterPanel — unregister a panel (called when <ApiPanel> unmounts)
   * 调用方 / Called by: src/components/common/ApiPanel.tsx → useEffect cleanup
   */
  unregisterPanel: (id: string) => void;

  /**
   * initFromStorage — 从 localStorage 恢复全局设置和实例状态
   * initFromStorage — restore global settings and instance states from localStorage
   * 调用方 / Called by: ApiPanelProvider.tsx 在客户端首次挂载时调用（useEffect）
   */
  initFromStorage: () => void;
}

/**
 * useApiPanelStore — ApiPanel 的 Zustand store
 * useApiPanelStore — Zustand store for ApiPanel
 *
 * 初始状态说明 / Initial state note:
 *   全局设置初始为默认值（非持久化值），initFromStorage 被调用后才更新为持久化值。
 *   Global settings start as defaults; updated to persisted values after initFromStorage is called.
 */
export const useApiPanelStore = create<ApiPanelStoreState>((set, get) => ({
  global: { position: "right", mode: "float" },
  instances: {},
  entries: {},
  configs: {},

  setGlobalPosition: (position) => {
    const next = { ...get().global, position };
    saveGlobal(next);
    set({ global: next });
  },

  setGlobalMode: (mode) => {
    const next = { ...get().global, mode };
    saveGlobal(next);
    set({ global: next });
  },

  setOpen: (id, isOpen) => {
    const instances = get().instances;
    const cur = instances[id] ?? { size: DEFAULT_SIZE, isOpen: false };
    const next = { ...instances, [id]: { ...cur, isOpen } };
    saveInstances(next);
    set({ instances: next });
  },

  setSize: (id, size) => {
    const instances = get().instances;
    const cur = instances[id] ?? { size: DEFAULT_SIZE, isOpen: false };
    const next = { ...instances, [id]: { ...cur, size } };
    saveInstances(next);
    set({ instances: next });
  },

  setEntry: (id, entry) =>
    set((s) => ({ entries: { ...s.entries, [id]: entry } })),

  registerPanel: (config) =>
    set((s) => ({
      configs: { ...s.configs, [config.id]: config },
      // 若该面板尚无实例记录则初始化默认值（localStorage 恢复会在 initFromStorage 中覆盖）
      // Init default instance if not yet tracked (localStorage restore happens later in initFromStorage)
      instances: {
        ...s.instances,
        [config.id]: s.instances[config.id] ?? {
          size: DEFAULT_SIZE,
          isOpen: false,
        },
      },
    })),

  unregisterPanel: (id) =>
    set((s) => {
      // 从 configs 中移除，保留 instances（用户的尺寸/开关偏好保留）
      // Remove from configs but keep instances (user's size/open preferences are retained)
      const { [id]: _, ...configs } = s.configs;
      return { configs };
    }),

  initFromStorage: () => {
    const global = loadGlobal();
    const stored = loadInstances();
    set((s) => ({
      global,
      instances: {
        // 当前内存中的默认值优先，localStorage 数据覆盖
        // Current in-memory defaults first, localStorage data overrides
        ...s.instances,
        ...stored,
      },
    }));
  },
}));

/**
 * useApiPanelNavbarTop — 计算 Navbar sticky top 偏移量
 * useApiPanelNavbarTop — compute Navbar sticky top offset
 *
 * 作用 / Purpose:
 *   当 top 位置的侧边栏面板处于展开状态时，Navbar 的 sticky top 必须等于面板高度，
 *   否则 Navbar 会滚动到固定面板的后面（被遮住）。
 *   When a sidebar panel is docked at "top" and is open, the Navbar's sticky top
 *   must equal the panel height; otherwise the Navbar would scroll behind the fixed panel.
 *
 * 返回值 / Returns:
 *   - 面板展开：最大面板高度（px）/ Panel open: max panel height (px)
 *   - 面板折叠但有注册面板：CLOSED_TAB_PX（仅显示 tab 时占的高度）
 *   - 其他情况（非 top sidebar）：0
 *
 * 调用方 / Called by: src/components/common/Navbar.tsx
 */
export function useApiPanelNavbarTop(): number {
  const global = useApiPanelStore((s) => s.global);
  const configs = useApiPanelStore((s) => s.configs);
  const instances = useApiPanelStore((s) => s.instances);

  // 只有 top + sidebar 模式才需要偏移
  // Only top+sidebar mode requires an offset
  if (global.mode !== "sidebar" || global.position !== "top") return 0;
  if (!Object.keys(configs).length) return 0;

  const openSizes = Object.keys(configs)
    .map((id) => instances[id])
    .filter((inst) => inst?.isOpen)
    .map((inst) => inst!.size);

  // 有展开的面板 → 用最大高度；都折叠 → 仅留 tab 占的高度
  // Open panels → use max size; all collapsed → only reserve tab space
  return openSizes.length > 0 ? Math.max(...openSizes) : CLOSED_TAB_PX;
}
