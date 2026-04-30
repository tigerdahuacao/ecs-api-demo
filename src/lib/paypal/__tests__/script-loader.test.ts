/**
 * @file src/lib/paypal/__tests__/script-loader.test.ts
 * script-loader 单元测试 / Unit tests for script-loader
 * TDD RED phase — 先写测试再实现 / Write tests before implementation
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// 每个测试前重置模块状态，确保单例状态隔离
// Reset module state before each test to isolate singleton state
beforeEach(() => {
  vi.resetModules();
  // 清理 DOM 中注入的 script 标签 / Clean up injected script tags from DOM
  document.head.innerHTML = "";
});

describe("loadScript", () => {
  it("第一次调用应创建 script 标签并挂载到 head / first call creates script tag and appends to head", async () => {
    const { loadScript } = await import("../script-loader");

    const src = "https://example.com/test1.js";

    // 模拟 script.onload / Simulate script.onload
    let onloadRef: (() => void) | null = null;
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === "script") {
        setTimeout(() => {
          onloadRef?.();
        }, 0);
        Object.defineProperty(el, "onload", {
          set(fn) { onloadRef = fn; },
          get() { return onloadRef; },
        });
      }
      return el;
    });

    await loadScript(src);
    const scripts = document.head.querySelectorAll(`script[src="${src}"]`);
    expect(scripts.length).toBe(1);
    vi.restoreAllMocks();
  });

  it("第二次调用相同 src 应返回已解析的 Promise，不重复创建标签 / second call with same src returns resolved promise without creating duplicate tag", async () => {
    const { loadScript, isScriptLoaded } = await import("../script-loader");

    const src = "https://example.com/test2.js";

    let onloadRef: (() => void) | null = null;
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === "script") {
        setTimeout(() => onloadRef?.(), 0);
        Object.defineProperty(el, "onload", {
          set(fn) { onloadRef = fn; },
          get() { return onloadRef; },
        });
      }
      return el;
    });

    await loadScript(src);
    vi.restoreAllMocks();

    const createSpy = vi.spyOn(document, "createElement");
    await loadScript(src); // 第二次调用 / Second call
    expect(createSpy).not.toHaveBeenCalled();
    createSpy.mockRestore();
  });

  it("并发调用相同 src 只发起一次 DOM 操作 / concurrent calls for same src only create one script element", async () => {
    const { loadScript } = await import("../script-loader");

    const src = "https://example.com/test3.js";
    let onloadRef: (() => void) | null = null;
    const origCreate = document.createElement.bind(document);
    const createSpy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === "script") {
        setTimeout(() => onloadRef?.(), 0);
        Object.defineProperty(el, "onload", {
          set(fn) { onloadRef = fn; },
          get() { return onloadRef; },
        });
      }
      return el;
    });

    await Promise.all([loadScript(src), loadScript(src), loadScript(src)]);
    const scriptCalls = createSpy.mock.calls.filter(([tag]) => tag === "script").length;
    expect(scriptCalls).toBe(1);
    vi.restoreAllMocks();
  });
});

describe("isScriptLoaded", () => {
  it("加载前返回 false / returns false before loading", async () => {
    const { isScriptLoaded } = await import("../script-loader");
    expect(isScriptLoaded("https://example.com/never.js")).toBe(false);
  });

  it("加载后返回 true / returns true after successful load", async () => {
    const { loadScript, isScriptLoaded } = await import("../script-loader");
    const src = "https://example.com/loaded.js";

    let onloadRef: (() => void) | null = null;
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === "script") {
        setTimeout(() => onloadRef?.(), 0);
        Object.defineProperty(el, "onload", {
          set(fn) { onloadRef = fn; },
          get() { return onloadRef; },
        });
      }
      return el;
    });

    await loadScript(src);
    vi.restoreAllMocks();
    expect(isScriptLoaded(src)).toBe(true);
  });
});

describe("unloadScript", () => {
  it("卸载后移除 DOM 节点并重置状态 / removes DOM node and resets state after unload", async () => {
    const { loadScript, isScriptLoaded, unloadScript } = await import("../script-loader");
    const src = "https://example.com/unload.js";

    let onloadRef: (() => void) | null = null;
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === "script") {
        setTimeout(() => onloadRef?.(), 0);
        Object.defineProperty(el, "onload", {
          set(fn) { onloadRef = fn; },
          get() { return onloadRef; },
        });
      }
      return el;
    });

    await loadScript(src);
    vi.restoreAllMocks();
    expect(isScriptLoaded(src)).toBe(true);

    unloadScript(src);
    expect(isScriptLoaded(src)).toBe(false);
    expect(document.querySelector(`script[src="${src}"]`)).toBeNull();
  });
});
