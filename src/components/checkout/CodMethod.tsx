/**
 * @file src/components/checkout/CodMethod.tsx
 * 货到付款支付方式组件 / Cash on Delivery payment method component
 *
 * 无异步初始化，挂载后立即调用 onReady() 解锁 PaymentWall tab 切换。
 * No async init — calls onReady() immediately on mount to unlock PaymentWall tabs.
 *
 * 被引用于 / Imported by: src/components/checkout/PaymentWall.tsx → METHOD_COMPONENTS
 */
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Truck } from "lucide-react";
import type { PaymentMethodComponentProps } from "./PaymentWall";

/**
 * CodMethod — 货到付款组件
 * CodMethod — Cash on Delivery component
 *
 * 渲染一个确认按钮；点击后模拟下单，调用 onSuccess。
 * Renders a confirm button; on click simulates order placement and calls onSuccess.
 */
export function CodMethod({ amount, onSuccess, onError, onReady }: PaymentMethodComponentProps) {
  const t = useTranslations("checkout");
  const [placing, setPlacing] = useState(false);

  // 无异步初始化，立即通知 PaymentWall 就绪 / No async init — signal ready immediately
  useEffect(() => {
    onReady();
  }, [onReady]);

  const handleConfirm = async () => {
    setPlacing(true);
    try {
      // 模拟网络延迟（实际应调用 POST /api/orders）
      // Simulate network delay (production should call POST /api/orders)
      await new Promise((r) => setTimeout(r, 800));
      onSuccess(`cod-${Date.now()}`);
    } catch (e) {
      onError(e);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* 说明文字 / Description */}
      <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
        <Truck size={16} className="shrink-0 mt-0.5" />
        <p>
          {t("codDesc")}
        </p>
      </div>

      {/* 金额展示 / Amount display */}
      <div className="flex justify-between text-sm px-1">
        <span className="text-gray-500 dark:text-gray-400">{t("total")}</span>
        <span className="font-bold text-primary-600 dark:text-primary-400">
          ¥{amount.toFixed(2)}
        </span>
      </div>

      {/* 确认按钮 / Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={placing}
        className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {placing ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Truck size={16} />
        )}
        {t("confirmCod")}
      </button>
    </div>
  );
}
