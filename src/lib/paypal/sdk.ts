/**
 * @file src/lib/paypal/sdk.ts
 * PayPal Web SDK v6 加载工具
 * PayPal Web SDK v6 loading utilities
 *
 * 作用 / Purpose:
 *   封装 PayPal Web SDK script 的加载、检测和卸载。
 *   SDK 加载后将 window.paypal 对象注入到全局，可调用 createInstance() 初始化支付实例。
 *   Wraps loading/detecting/unloading of the PayPal Web SDK script.
 *   After loading, window.paypal is available globally for calling createInstance().
 *
 * 沙盒 vs 生产 / Sandbox vs production:
 *   根据环境变量 NEXT_PUBLIC_PAYPAL_ENV 自动选择 URL；默认使用沙盒。
 *   Automatically selects URL based on NEXT_PUBLIC_PAYPAL_ENV; defaults to sandbox.
 *
 * 被引用于 / Imported by:
 *   src/hooks/usePayPalSdk.ts → 在 React 组件中加载 SDK
 */
import { loadScript, isScriptLoaded, unloadScript } from "./script-loader";

/** PayPal Web SDK v6 沙盒 URL / PayPal Web SDK v6 sandbox URL */
const SANDBOX_SRC = "https://www.sandbox.paypal.com/web-sdk/v6/core";
/** PayPal Web SDK v6 生产 URL / PayPal Web SDK v6 production URL */
const PRODUCTION_SRC = "https://www.paypal.com/web-sdk/v6/core";

/** <script> 标签的 id 属性，用于后续查找 / id attribute on the injected script tag for later lookup */
const SCRIPT_ID = "paypal-websdk-v6-core";

/**
 * 根据环境变量获取正确的 SDK URL
 * Get the correct SDK URL based on environment variable
 *
 * 读取 NEXT_PUBLIC_PAYPAL_ENV（可在前端访问），默认 "sandbox"
 * Reads NEXT_PUBLIC_PAYPAL_ENV (accessible on client), defaults to "sandbox"
 */
function getSdkSrc(): string {
  const env = process.env.NEXT_PUBLIC_PAYPAL_ENV ?? "sandbox";
  return env === "production" ? PRODUCTION_SRC : SANDBOX_SRC;
}

/**
 * loadPayPalSdk — 加载 PayPal Web SDK v6
 * loadPayPalSdk — load PayPal Web SDK v6
 *
 * 单例模式：多次调用只注入一个 <script> 标签
 * Singleton: multiple calls only inject one <script> tag
 *
 * @returns Promise<void> SDK 脚本加载完成后 resolve / resolves when SDK script is loaded
 *
 * 被引用于 / Used by: src/hooks/usePayPalSdk.ts
 */
export function loadPayPalSdk(): Promise<void> {
  const src = getSdkSrc();
  return loadScript(src, {
    attributes: {
      id: SCRIPT_ID,
      crossOrigin: "anonymous",
    },
  });
}

/**
 * isPayPalSdkLoaded — 判断 PayPal SDK 是否已加载
 * isPayPalSdkLoaded — check if PayPal SDK is loaded
 *
 * @returns true 表示 SDK 已成功注入并可用 / true if SDK script is loaded and available
 *
 * 被引用于 / Used by: src/hooks/usePayPalSdk.ts（初始化 ready 状态）
 */
export function isPayPalSdkLoaded(): boolean {
  if (typeof window === "undefined") return false;
  const el = document.getElementById(SCRIPT_ID);
  if (!el) return false;
  const src = el.getAttribute("src");
  return src ? isScriptLoaded(src) : false;
}

/**
 * unloadPayPalSdk — 卸载 PayPal SDK 脚本
 * unloadPayPalSdk — unload the PayPal SDK script
 *
 * 从 DOM 移除 <script> 标签并重置单例状态，用于测试或强制重新加载。
 * Removes the <script> tag from DOM and resets singleton state, useful for tests or forced reload.
 *
 * 被引用于 / Used by: 测试环境 / Test environment
 */
export function unloadPayPalSdk(): void {
  const el = document.getElementById(SCRIPT_ID);
  const src = el?.getAttribute("src");
  if (src) {
    unloadScript(src);
  }
}
