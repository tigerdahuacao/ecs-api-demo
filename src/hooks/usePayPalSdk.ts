/**
 * @file src/hooks/usePayPalSdk.ts
 * React Hook：加载 PayPal Web SDK v6 并跟踪其状态
 * React Hook: loads PayPal Web SDK v6 and tracks its loading state
 *
 * 作用 / Purpose:
 *   在组件挂载时调用 loadPayPalSdk() 动态注入 PayPal SDK script。
 *   返回 { ready, loading, error } 三态，供组件控制渲染逻辑。
 *
 *   On component mount, calls loadPayPalSdk() to dynamically inject the PayPal SDK script.
 *   Returns { ready, loading, error } three-state for components to control rendering logic.
 *
 * 单例保证 / Singleton guarantee:
 *   loadPayPalSdk() 内部使用 script-loader 单例，多个组件实例调用此 hook
 *   只会注入一次 <script> 标签，不会重复加载。
 *   loadPayPalSdk() uses the script-loader singleton internally; multiple component instances
 *   calling this hook will only inject the <script> tag once.
 *
 * 被引用于 / Imported by:
 *   src/components/checkout/CheckoutView.tsx → 结算页加载 SDK
 *   src/components/checkout/CheckoutView.tsx → checkout page loads SDK
 *
 * @example
 * ```tsx
 * const { ready, loading, error } = usePayPalSdk();
 * if (loading) return <Spinner />;
 * if (error) return <p>SDK 加载失败</p>;
 * // ready === true，window.paypal 可用
 * ```
 */
"use client";

import { useEffect, useState } from "react";
import { loadPayPalSdk, isPayPalSdkLoaded } from "@/lib/paypal/sdk";

/**
 * usePayPalSdk — 加载并跟踪 PayPal Web SDK v6 的状态
 * usePayPalSdk — load and track the PayPal Web SDK v6 state
 *
 * @returns {Object} SDK 加载状态 / SDK loading state
 *   - ready: boolean   — SDK 已加载完成，window.paypal 可用 / SDK loaded, window.paypal available
 *   - loading: boolean — SDK 正在加载中 / SDK is loading
 *   - error: Error | null — 加载失败的错误对象 / error if loading failed
 */
export  function  usePayPalSdk() {
  const alreadyLoaded = isPayPalSdkLoaded();
  const [ready, setReady] = useState<boolean>(alreadyLoaded);
  const [loading, setLoading] = useState<boolean>(!alreadyLoaded);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // SDK 已加载时跳过，避免重复请求 / Skip if SDK already loaded to avoid redundant calls
    if (isPayPalSdkLoaded()) return;

    let cancelled = false;

    loadPayPalSdk()
      .then(() => {
        if (!cancelled) {
          setReady(true);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setLoading(false);
        }
      });

    return () => {
      // 组件卸载时设置 cancelled flag，避免更新已卸载组件的状态
      // Set cancelled flag on unmount to prevent updating state of unmounted component
      cancelled = true;
    };
  }, []);

  return { ready, loading, error };
}
