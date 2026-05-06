/**
 * @file src/components/common/PayPalButton.tsx
 * 通用 PayPal 支付按钮组件
 * Generic PayPal payment button component
 *
 * 作用 / Purpose:
 *   封装 PayPal Web SDK v6 的按钮初始化流程，渲染 <paypal-button> Web Component。
 *   按钮宽度填满父容器，高度由 minHeight prop 控制（默认 48px）。
 *
 *   Encapsulates the PayPal Web SDK v6 button initialization flow,
 *   rendering the <paypal-button> web component.
 *   Button width fills the parent container; height is controlled by minHeight prop (default 48px).
 *
 * 使用流程 / Usage flow:
 *   1. 组件挂载后等待 SDK ready（通过 usePayPalSdk hook）
 *   2. 调用 GET /api/paypal/client-token 获取访问令牌
 *   3. 调用 window.paypal.createInstance() 创建 SDK 实例
 *   4. 调用 sdkInstance.createPayPalOneTimePaymentSession() 创建支付会话
 *   5. 显示 <paypal-button>，绑定 click 事件触发 paymentSession.start()
 *   6. onApprove → 调用 POST /api/paypal/capture-order → 回调 onSuccess
 *
 * 被引用于 / Imported by:
 *   src/components/checkout/CheckoutView.tsx
 *
 * @example
 * ```tsx
 * <PayPalButton
 *   currency="USD"
 *   amount={total}
 *   onSuccess={(orderId) => console.log("paid:", orderId)}
 *   onError={(e) => console.error(e)}
 *   onCancel={() => console.log("cancelled")}
 * />
 * ```
 */
"use client";

import { useEffect, useRef, useId } from "react";
import { usePayPalSdk } from "@/hooks/usePayPalSdk";

// ── 类型 / Types ──────────────────────────────────────────────────────────────

/** 传递给后端 create-order 的单个商品条目 / Single item sent to the create-order backend */
export interface PayPalOrderItem {
  /** 商品 ID（用作 PayPal SKU）/ Product ID (used as PayPal SKU) */
  id?: string;
  /** 商品名称（传当前 locale 的字符串）/ Product name (pass current-locale string) */
  name: string;
  /** 单价 / Unit price */
  unitPrice: number;
  /** 数量 / Quantity */
  quantity: number;
}

/** PayPalButton 组件的 props / Props for the PayPalButton component */
export interface PayPalButtonProps {
  /**
   * 货币代码 / Currency code
   * @default "USD"
   */
  currency?: string;
  /** 支付金额（所有商品小计之和）/ Payment amount (sum of all item subtotals) */
  amount: number;
  /**
   * 购物车商品列表（传给后端用于组装 PayPal 订单明细）
   * Cart items (sent to backend to build PayPal order line items)
   */
  items: PayPalOrderItem[];
  /**
   * 按钮最小高度（CSS 值）/ Minimum button height (CSS value)
   * @default "48px"
   */
  minHeight?: string;
  /** 支付成功回调 / Called when payment is captured successfully */
  onSuccess?: (orderId: string) => void;
  /** 支付失败回调 / Called when payment encounters an error */
  onError?: (error: unknown) => void;
  /** 用户取消支付回调 / Called when user cancels payment */
  onCancel?: () => void;
  /**
   * 组件就绪回调：SDK 初始化完成、按钮已显示后调用
   * Called when the SDK is initialized and the button is visible
   * PaymentWall 收到此回调后解除 tab 切换锁 / PaymentWall uses this to unlock tab switching
   */
  onReady?: () => void;
}

// ── 辅助：获取 clientToken ─────────────────────────────────────────────────

/**
 * fetchClientToken — 请求后端获取 PayPal 访问令牌
 * fetchClientToken — request backend for a PayPal access token
 *
 * @returns Promise<string> clientToken
 * @throws Error 若请求失败 / if request fails
 */
async function fetchClientToken(): Promise<string> {
  const res = await fetch("/api/paypal/client-token");
  const json = await res.json() as { success: boolean; data?: { clientToken: string }; error?: string };
  if (!json.success || !json.data?.clientToken) {
    throw new Error(json.error ?? "Failed to fetch PayPal client token");
  }
  return json.data.clientToken;
}

// ── 辅助：创建订单 ─────────────────────────────────────────────────────────

/**
 * createPayPalOrder — 调用后端创建 PayPal 订单
 * createPayPalOrder — call backend to create a PayPal order
 *
 * @param amount   总金额 / Total amount
 * @param currency 货币代码 / Currency code
 * @param items    商品明细（传给 PayPal 订单 line items）/ Line items for the PayPal order
 * @returns Promise<{ orderId: string }> — PayPal SDK start() 要求的格式
 *          PayPal SDK start() expects this shape, not a plain string
 */
async function createPayPalOrder(
  amount: number,
  currency: string,
  items: PayPalOrderItem[]
): Promise<{ orderId: string }> {
  const res = await fetch("/api/paypal/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ totalAmount: amount, currency, items }),
  });
  const json = await res.json() as { success: boolean; data?: { orderId: string }; error?: string };
  if (!json.success || !json.data?.orderId) {
    throw new Error(json.error ?? "Failed to create PayPal order");
  }
  return { orderId: json.data.orderId };
}

// ── 辅助：捕获订单 ─────────────────────────────────────────────────────────

/**
 * capturePayPalOrder — 调用后端 capture 订单完成支付
 * capturePayPalOrder — call backend to capture order and complete payment
 *
 * @param orderId PayPal 订单 ID / PayPal order ID
 * @returns Promise<string> 捕获后的订单 ID / captured order ID
 */
async function capturePayPalOrder(orderId: string): Promise<string> {
  const res = await fetch("/api/paypal/capture-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });
  const json = await res.json() as { success: boolean; data?: { orderId: string }; error?: string };
  if (!json.success) {
    throw new Error(json.error ?? "Failed to capture PayPal order");
  }
  return json.data?.orderId ?? orderId;
}

// ── 组件 / Component ───────────────────────────────────────────────────────

/**
 * PayPalButton — 通用 PayPal 支付按钮
 * PayPalButton — generic PayPal payment button
 *
 * 宽度填满父容器，高度通过 minHeight prop 控制。
 * Width fills parent container; height controlled by minHeight prop.
 *
 * @param props PayPalButtonProps
 */
export function PayPalButton({
  currency = "USD",
  amount,
  items,
  minHeight = "48px",
  onSuccess,
  onError,
  onCancel,
  onReady,
}: PayPalButtonProps) {
  const { ready, loading, error: sdkError } = usePayPalSdk();

  // 用唯一 id 避免多个实例互相干扰 / Use unique id to avoid conflicts between multiple instances
  const uid = useId().replace(/:/g, "");
  const btnId = `paypal-btn-${uid}`;

  // 记录 sdkInstance，用于 cleanup 时销毁 / Track sdkInstance for cleanup/destroy
  const sdkInstanceRef = useRef<{ destroy?: () => void } | null>(null);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    (async () => {
      try {
        const clientToken = await fetchClientToken();
        if (cancelled) return;

        const paypal = (window as Window & typeof globalThis & { paypal?: { createInstance: (o: unknown) => Promise<unknown> } }).paypal;
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

        // 支付会话选项 / Payment session options
        const paymentSession = sdkInstance.createPayPalOneTimePaymentSession({
          onApprove: async (data: { orderId?: string; data?: { orderId?: string } }) => {
            try {
              const orderId = data.orderId ?? data.data?.orderId ?? "";
              const captured = await capturePayPalOrder(orderId);
              if (!cancelled) onSuccess?.(captured);
            } catch (e) {
              if (!cancelled) onError?.(e);
            }
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

        // 按钮已显示 → 通知 PaymentWall 解除 tab 切换锁
        // Button is now visible → notify PaymentWall to unlock tab switching
        if (!cancelled) onReady?.();

        // 在 click 前创建订单 Promise（不 await，避免 transient activation 问题）
        // Create order Promise before click — do NOT await here to avoid transient activation issues
        const orderPromise = createPayPalOrder(amount, currency, items);

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
  }, [ready, amount, currency, items, btnId, onSuccess, onError, onCancel, onReady]);

  // ── 加载中 / Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="w-full flex items-center justify-center bg-[#ffc439] rounded-lg animate-pulse"
        style={{ minHeight }}
        aria-label="Loading PayPal"
      >
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── SDK 加载失败 / SDK load error ──────────────────────────────────────────
  if (sdkError) {
    return (
      <div
        className="w-full flex items-center justify-center bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs"
        style={{ minHeight }}
      >
        PayPal 加载失败 / SDK load failed
      </div>
    );
  }

  // ── 正常渲染 / Normal render ───────────────────────────────────────────────
  return (
    <div className="w-full" style={{ minHeight }}>
      {/* PayPal Web SDK v6 自定义元素，hidden 属性由 effect 移除 */}
      {/* PayPal Web SDK v6 custom element; hidden attribute is removed by effect */}
      {/* @ts-expect-error paypal-button is a custom element registered by the SDK */}
      <paypal-button
        id={btnId}
        type="pay"
        hidden
        style={{ width: "100%", minHeight }}
      />
    </div>
  );
}
