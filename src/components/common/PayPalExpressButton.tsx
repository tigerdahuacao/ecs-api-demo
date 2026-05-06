/**
 * @file src/components/common/PayPalExpressButton.tsx
 * PayPal Express Checkout Shortcut 按钮组件
 * PayPal Express Checkout Shortcut button component
 *
 * 作用 / Purpose:
 *   实现 PayPal Express Checkout Shortcut 流程：
 *   1. 创建 express 订单（POST /api/paypal/create-order-express）
 *      shipping_preference: "GET_FROM_FILE" 从买家 PayPal 账户获取地址
 *   2. 打开 PayPal 弹窗，买家登录并授权
 *   3. onApprove 触发：不立即 capture，而是调用 onApprove(orderId) 让父组件决定后续操作
 *      （通常：存入 Zustand payment store → 跳转到 checkout 页面）
 *   4. 在 checkout 页面，买家点击 "Confirm & Pay" 完成 capture
 *
 *   Implements the PayPal Express Checkout Shortcut flow:
 *   1. Creates an express order (POST /api/paypal/create-order-express)
 *      shipping_preference: "GET_FROM_FILE" — address from buyer's PayPal account
 *   2. Opens PayPal popup; buyer logs in and approves
 *   3. onApprove fires: does NOT capture immediately; calls onApprove(orderId) for parent to handle
 *      (typically: store in Zustand payment store → navigate to checkout page)
 *   4. At checkout, buyer clicks "Confirm & Pay" to complete capture
 *
 * 与 PayPalButton 的区别 / Differences from PayPalButton:
 *   - 调用 create-order-express 而非 create-order
 *   - onApprove 不 capture，而是回调父组件
 *   - 设计用于商品页和购物车页的快捷入口
 *
 * 被引用于 / Imported by:
 *   src/components/product/ProductDetail.tsx
 *   src/components/cart/CartView.tsx
 */
"use client";

import { useEffect, useRef, useId } from "react";
import { usePayPalSdk } from "@/hooks/usePayPalSdk";
import type { PayPalOrderItem } from "./PayPalButton";

// ── 类型 / Types ──────────────────────────────────────────────────────────────

export interface PayPalExpressButtonProps {
  /** 支付金额 / Payment amount */
  amount: number;
  /** 货币代码 / Currency code */
  currency?: string;
  /** 购物车商品列表 / Cart line items */
  items: PayPalOrderItem[];
  /**
   * 按钮最小高度 / Minimum button height
   * @default "48px"
   */
  minHeight?: string;
  /**
   * 组件就绪回调（SDK 初始化完成、按钮显示后）
   * Called when SDK is initialized and button is visible
   */
  onReady?: () => void;
  /**
   * 买家授权成功回调（此时订单已创建并获授权，尚未 capture）
   * Called after buyer approves in PayPal popup (order created & approved, not yet captured)
   * 父组件应将 orderId 存入 Zustand 并跳转至 checkout
   * Parent should store orderId in Zustand and navigate to checkout
   */
  onApprove: (orderId: string) => void;
  /** 支付失败回调 / Called on error */
  onError?: (error: unknown) => void;
  /** 用户取消回调 / Called when user cancels */
  onCancel?: () => void;
}

// ── 辅助函数 / Helpers ─────────────────────────────────────────────────────

async function fetchClientToken(): Promise<string> {
  const res = await fetch("/api/paypal/client-token");
  const json = await res.json() as { success: boolean; data?: { clientToken: string }; error?: string };
  if (!json.success || !json.data?.clientToken) {
    throw new Error(json.error ?? "Failed to fetch PayPal client token");
  }
  return json.data.clientToken;
}

async function createExpressOrder(
  amount: number,
  currency: string,
  items: PayPalOrderItem[]
): Promise<{ orderId: string }> {
  const res = await fetch("/api/paypal/create-order-express", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ totalAmount: amount, currency, items }),
  });
  const json = await res.json() as { success: boolean; data?: { orderId: string }; error?: string };
  if (!json.success || !json.data?.orderId) {
    throw new Error(json.error ?? "Failed to create express PayPal order");
  }
  return { orderId: json.data.orderId };
}

// ── 组件 / Component ───────────────────────────────────────────────────────

/**
 * PayPalExpressButton — Express Checkout Shortcut 入口按钮
 * PayPalExpressButton — Express Checkout Shortcut entry button
 *
 * 宽度填满父容器，高度通过 minHeight prop 控制。
 * Width fills parent; height controlled by minHeight prop.
 */
export function PayPalExpressButton({
  amount,
  currency = "USD",
  items,
  minHeight = "48px",
  onReady,
  onApprove,
  onError,
  onCancel,
}: PayPalExpressButtonProps) {
  const { ready, loading, error: sdkError } = usePayPalSdk();

  const uid = useId().replace(/:/g, "");
  const btnId = `paypal-express-btn-${uid}`;

  const sdkInstanceRef = useRef<{ destroy?: () => void } | null>(null);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    (async () => {
      try {
        const clientToken = await fetchClientToken();
        if (cancelled) return;

        const paypal = (window as Window & typeof globalThis & {
          paypal?: { createInstance: (o: unknown) => Promise<unknown> };
        }).paypal;
        if (!paypal) throw new Error("window.paypal is not available");

        const sdkInstance = await paypal.createInstance({
          clientToken,
          components: ["paypal-payments"],
          pageType: "checkout",
        }) as {
          createPayPalOneTimePaymentSession: (opts: unknown) => {
            start: (mode: unknown, orderPromise: Promise<{ orderId: string }>) => Promise<void>;
          };
          destroy?: () => void;
        };

        if (cancelled) {
          sdkInstance.destroy?.();
          return;
        }

        sdkInstanceRef.current = sdkInstance;

        const paymentSession = sdkInstance.createPayPalOneTimePaymentSession({
          onApprove: (data: { orderId?: string; data?: { orderId?: string } }) => {
            const orderId = data.orderId ?? data.data?.orderId ?? "";
            // Express checkout: do NOT capture here — let the parent decide
            // 快捷结账：不在这里 capture，由父组件决定后续操作（存储 orderId + 跳转到 checkout）
            if (!cancelled) onApprove(orderId);
          },
          onCancel: () => {
            if (!cancelled) onCancel?.();
          },
          onError: (e: unknown) => {
            if (!cancelled) onError?.(e);
          },
        });

        const btn = document.getElementById(btnId);
        if (!btn || cancelled) return;

        btn.removeAttribute("hidden");
        if (!cancelled) onReady?.();

        const orderPromise = createExpressOrder(amount, currency, items);

        btn.addEventListener("click", async () => {
          try {
            await paymentSession.start({ presentationMode: "auto" }, orderPromise);
          } catch (e) {
            if (!cancelled) onError?.(e);
          }
        });
      } catch (e) {
        if (!cancelled) onError?.(e);
      }
    })();

    return () => {
      cancelled = true;
      sdkInstanceRef.current?.destroy?.();
      sdkInstanceRef.current = null;
    };
  }, [ready, amount, currency, items, btnId, onApprove, onError, onCancel, onReady]);

  if (loading) {
    return (
      <div
        className="w-full flex items-center justify-center bg-[#ffc439] rounded-xl animate-pulse"
        style={{ minHeight }}
        aria-label="Loading PayPal"
      >
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (sdkError) {
    return (
      <div
        className="w-full flex items-center justify-center bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs"
        style={{ minHeight }}
      >
        PayPal 加载失败 / SDK load failed
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl overflow-hidden" style={{ minHeight }}>
      {/* @ts-expect-error paypal-button is a custom element registered by the SDK */}
      <paypal-button
        id={btnId}
        type="checkout"
        hidden
        style={{ width: "100%", minHeight }}
      />
    </div>
  );
}
