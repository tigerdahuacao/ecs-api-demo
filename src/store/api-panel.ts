import { create } from "zustand";
import type { ApiPanelPosition } from "@/types";

/** Width of the closed-state tab in sidebar mode (px). Shared with Navbar. */
export const CLOSED_TAB_PX = 24;

export type ApiPanelMode = "float" | "sidebar";

export interface PanelDataEntry {
  request: unknown;
  response: unknown;
  timestamp: number;
}

// ── Global settings — shared across ALL panels and ALL routes ──────────────
// Position and mode are global: changing on one panel updates all panels.
export interface GlobalPanelSettings {
  position: ApiPanelPosition;
  mode: ApiPanelMode;
}

// ── Per-panel instance state — only size & isOpen ─────────────────────────
export interface PanelInstanceState {
  size: number;   // width (left/right) or height (top/bottom) in px
  isOpen: boolean;
}

export interface PanelConfig {
  id: string;
  title: string;
  defaultPosition: ApiPanelPosition;
  suggestions?: string;
  nextSteps?: string;
}

const DEFAULT_SIZE = 360;
const GLOBAL_KEY = "ecs_api_panel_global";
const INSTANCE_KEY = "ecs_api_panel_instances";

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

function saveGlobal(s: GlobalPanelSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GLOBAL_KEY, JSON.stringify(s));
}

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

function saveInstances(s: Record<string, PanelInstanceState>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(INSTANCE_KEY, JSON.stringify(s));
}

interface ApiPanelStoreState {
  // Global settings (position + mode) — persisted, affects all panels
  global: GlobalPanelSettings;
  setGlobalPosition: (position: ApiPanelPosition) => void;
  setGlobalMode: (mode: ApiPanelMode) => void;

  // Per-panel instance state (size + isOpen) — persisted per panel id
  instances: Record<string, PanelInstanceState>;
  setOpen: (id: string, isOpen: boolean) => void;
  setSize: (id: string, size: number) => void;

  // API data entries
  entries: Record<string, PanelDataEntry>;
  setEntry: (id: string, entry: PanelDataEntry) => void;

  // Panel configs (registered by page-level <ApiPanel /> components)
  configs: Record<string, PanelConfig>;
  registerPanel: (config: PanelConfig) => void;
  unregisterPanel: (id: string) => void;

  initFromStorage: () => void;
}

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
      // Initialise instance if not already tracked (localStorage fills in later)
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
      const { [id]: _, ...configs } = s.configs;
      return { configs };
    }),

  initFromStorage: () => {
    const global = loadGlobal();
    const stored = loadInstances();
    set((s) => ({
      global,
      instances: {
        // Merge: stored data takes priority, then current in-memory defaults
        ...s.instances,
        ...stored,
      },
    }));
  },
}));

/**
 * Returns the px offset the Navbar should use for its sticky `top` value.
 * When a "top" sidebar panel is open, the Navbar must stick BELOW the panel,
 * not at viewport top-0 (which would hide it behind the fixed panel).
 */
export function useApiPanelNavbarTop(): number {
  const global = useApiPanelStore((s) => s.global);
  const configs = useApiPanelStore((s) => s.configs);
  const instances = useApiPanelStore((s) => s.instances);

  if (global.mode !== "sidebar" || global.position !== "top") return 0;
  if (!Object.keys(configs).length) return 0;

  const openSizes = Object.keys(configs)
    .map((id) => instances[id])
    .filter((inst) => inst?.isOpen)
    .map((inst) => inst!.size);

  return openSizes.length > 0 ? Math.max(...openSizes) : CLOSED_TAB_PX;
}
