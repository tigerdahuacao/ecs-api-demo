import { create } from "zustand";
import type { ApiPanelPosition } from "@/types";

export type ApiPanelMode = "float" | "sidebar";

export interface PanelDataEntry {
  request: unknown;
  response: unknown;
  timestamp: number;
}

export interface PanelSettings {
  position: ApiPanelPosition;
  mode: ApiPanelMode;
  size: number; // width (left/right) or height (top/bottom) in px
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
const STORAGE_KEY = "ecs_api_panel_settings";

function loadSettings(): Record<string, PanelSettings> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveSettings(settings: Record<string, PanelSettings>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

interface ApiPanelStoreState {
  entries: Record<string, PanelDataEntry>;
  settings: Record<string, PanelSettings>;
  configs: Record<string, PanelConfig>;

  // Panel registration (called by page-level ApiPanel)
  registerPanel: (config: PanelConfig) => void;
  unregisterPanel: (id: string) => void;

  // Data updates (called by api-client)
  setEntry: (id: string, entry: PanelDataEntry) => void;

  // UI state (called by ApiPanelProvider)
  setOpen: (id: string, isOpen: boolean) => void;
  setPosition: (id: string, position: ApiPanelPosition) => void;
  setMode: (id: string, mode: ApiPanelMode) => void;
  setSize: (id: string, size: number) => void;

  // Derived helpers
  getSettings: (id: string) => PanelSettings;
  initFromStorage: () => void;
}

export const useApiPanelStore = create<ApiPanelStoreState>((set, get) => ({
  entries: {},
  settings: {},
  configs: {},

  registerPanel: (config) =>
    set((s) => ({
      configs: { ...s.configs, [config.id]: config },
      // Initialize settings from storage or defaults
      settings: {
        ...s.settings,
        [config.id]: s.settings[config.id] ?? {
          position: config.defaultPosition,
          mode: "float",
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

  setEntry: (id, entry) =>
    set((s) => ({ entries: { ...s.entries, [id]: entry } })),

  setOpen: (id, isOpen) => {
    const settings = get().settings;
    const current = settings[id];
    if (!current) return;
    const next = { ...settings, [id]: { ...current, isOpen } };
    saveSettings(next);
    set({ settings: next });
  },

  setPosition: (id, position) => {
    const settings = get().settings;
    const current = settings[id];
    if (!current) return;
    const next = { ...settings, [id]: { ...current, position } };
    saveSettings(next);
    set({ settings: next });
  },

  setMode: (id, mode) => {
    const settings = get().settings;
    const current = settings[id];
    if (!current) return;
    const next = { ...settings, [id]: { ...current, mode } };
    saveSettings(next);
    set({ settings: next });
  },

  setSize: (id, size) => {
    const settings = get().settings;
    const current = settings[id];
    if (!current) return;
    const next = { ...settings, [id]: { ...current, size } };
    saveSettings(next);
    set({ settings: next });
  },

  getSettings: (id) => {
    const s = get().settings[id];
    const config = get().configs[id];
    return (
      s ?? {
        position: config?.defaultPosition ?? "right",
        mode: "float",
        size: DEFAULT_SIZE,
        isOpen: false,
      }
    );
  },

  initFromStorage: () => {
    const stored = loadSettings();
    set((s) => ({
      settings: {
        ...stored,
        // Merge with any already-registered panels
        ...Object.fromEntries(
          Object.entries(s.settings).map(([id, cur]) => [
            id,
            stored[id] ?? cur,
          ])
        ),
      },
    }));
  },
}));
