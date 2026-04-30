/**
 * @file src/lib/paypal/script-loader.ts
 * 通用脚本动态加载器（单例 + 并发去重）
 * Generic dynamic script loader with singleton pattern and concurrent deduplication
 *
 * 核心设计 / Core design:
 *   - 每个 src 的状态存储在模块级 scriptStates 对象中，跨调用持久化
 *   - 同一 src 并发多次调用只注入一个 <script> 标签，共享同一个 Promise
 *   - Per-src state persisted in module-level scriptStates; concurrent calls share one Promise
 *
 * 被引用于 / Imported by:
 *   src/lib/paypal/sdk.ts → loadPayPalSdk()
 */

/** 单个脚本的加载状态 / Loading state for a single script */
type ScriptState = {
  loading: boolean;
  loaded: boolean;
  error: Error | null;
  promise: Promise<void> | null;
};

/**
 * 所有脚本状态的单例存储
 * Singleton store for all script states
 * keyed by src URL
 */
const scriptStates: Record<string, ScriptState> = {};

/** 脚本加载选项 / Options for loading a script */
export interface ScriptLoadOptions {
  /** 要设置到 <script> 标签上的额外属性 / Extra attributes to set on the <script> element */
  attributes?: Record<string, string>;
}

/**
 * isScriptLoaded — 判断脚本是否已成功加载
 * isScriptLoaded — check if a script has been successfully loaded
 *
 * @param src 脚本 URL / Script URL
 * @returns true 表示已加载完成 / true if fully loaded
 *
 * 被引用于 / Used by: src/lib/paypal/sdk.ts, src/hooks/usePayPalSdk.ts
 */
export function isScriptLoaded(src: string): boolean {
  return scriptStates[src]?.loaded ?? false;
}

/**
 * loadScript — 动态加载一个外部 JS 脚本（单例模式）
 * loadScript — dynamically load an external JS script (singleton pattern)
 *
 * 行为 / Behavior:
 *   1. 已加载 → 立即返回 resolved Promise（不重复创建标签）
 *   2. 加载中 → 返回已有 Promise（并发去重）
 *   3. 未加载 → 创建 <script> 标签并注入 document.head，返回新 Promise
 *
 * @param src 脚本 URL / Script URL
 * @param options 额外属性配置 / Optional attributes config
 * @returns Promise<void> 加载完成时 resolve，失败时 reject
 *
 * 被引用于 / Used by: src/lib/paypal/sdk.ts → loadPayPalSdk()
 */
export function loadScript(src: string, options: ScriptLoadOptions = {}): Promise<void> {
  if (isScriptLoaded(src)) {
    return Promise.resolve();
  }

  if (scriptStates[src]?.loading && scriptStates[src].promise) {
    return scriptStates[src].promise!;
  }

  scriptStates[src] = { loading: true, loaded: false, error: null, promise: null };

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;

    if (options.attributes) {
      for (const [key, value] of Object.entries(options.attributes)) {
        script.setAttribute(key, value);
      }
    }

    script.onload = () => {
      scriptStates[src] = { loading: false, loaded: true, error: null, promise: null };
      resolve();
    };

    script.onerror = () => {
      const error = new Error(`Failed to load script: ${src}`);
      scriptStates[src] = { loading: false, loaded: false, error, promise: null };
      reject(error);
    };

    document.head.appendChild(script);
  });

  scriptStates[src].promise = promise;
  return promise;
}

/**
 * unloadScript — 从 DOM 移除脚本标签并重置其状态
 * unloadScript — remove a script tag from the DOM and reset its state
 *
 * @param src 脚本 URL / Script URL
 *
 * 被引用于 / Used by: src/lib/paypal/sdk.ts → unloadPayPalSdk()
 */
export function unloadScript(src: string): void {
  const script = document.querySelector(`script[src="${src}"]`);
  if (script?.parentNode) {
    script.parentNode.removeChild(script);
  }

  scriptStates[src] = { loading: false, loaded: false, error: null, promise: null };
}
