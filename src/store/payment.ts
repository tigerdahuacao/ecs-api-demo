/**
 * @file src/store/payment.ts
 * 支付流程全局状态 / Global payment flow state
 *
 * 作用 / Purpose:
 *   管理 Express Checkout Shortcut 流程的跨页面状态。
 *   当用户在 product/cart 页面点击 PayPal 快捷按钮并完成授权后，
 *   将 PayPal 预授权订单 ID 存入此 store；在 checkout 页面读取并 capture。
 *
 *   Manages cross-page state for the Express Checkout Shortcut flow.
 *   After the user approves via PayPal on product/cart pages,
 *   the pre-authorized orderId is stored here and captured at checkout.
 *
 * 被引用于 / Imported by:
 *   - src/components/common/PayPalExpressButton.tsx (写入 / write)
 *   - src/components/checkout/CheckoutView.tsx      (读取 / read)
 */
import { create } from "zustand";

export interface PaymentState {
  /** PayPal 预授权订单 ID（null 表示无进行中的快捷结账）/ Pre-authorized PayPal orderId (null = no active express checkout) */
  expressOrderId: string | null;
  /** 存储快捷结账的预授权订单 ID / Store pre-authorized orderId from express checkout */
  setExpressOrder: (orderId: string) => void;
  /** 清除快捷结账状态（capture 成功或用户取消后调用）/ Clear express checkout state */
  clearExpressOrder: () => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  expressOrderId: null,
  setExpressOrder: (orderId) => set({ expressOrderId: orderId }),
  clearExpressOrder: () => set({ expressOrderId: null }),
}));
