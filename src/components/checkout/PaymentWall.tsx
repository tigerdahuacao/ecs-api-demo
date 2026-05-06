/**
 * @file src/components/checkout/PaymentWall.tsx
 * 支付墙组件 / Payment Wall component
 *
 * 作用 / Purpose:
 *   从 PAYMENT_WALL_CONFIG 读取启用的支付方式，渲染 tab 切换器 + 对应支付组件。
 *   关键特性：当前激活的支付组件还未渲染完成（isCurrentReady=false）时，
 *   其他 tab 处于禁用状态，防止用户在异步加载过程中切换导致状态错乱。
 *
 *   Reads enabled payment methods from PAYMENT_WALL_CONFIG, renders a tab
 *   switcher + the corresponding payment component.
 *   Key feature: while the active payment component hasn't finished rendering
 *   (isCurrentReady=false), other tabs are disabled to prevent switching
 *   during async initialization.
 *
 * 被引用于 / Imported by:
 *   src/components/checkout/CheckoutView.tsx
 *
 * 扩展方式 / How to add a payment method:
 *   1. 在 src/config/payment-wall.ts 中新增配置条目并设 enabled: true
 *   2. 在下方 METHOD_COMPONENTS 中注册组件（实现 PaymentMethodComponentProps 接口）
 */
"use client";

import { useState, useCallback, memo } from "react";
import { useLocale } from "next-intl";
import { getEnabledMethods, type PaymentMethodId } from "@/config/payment-wall";
import { PayPalButton, type PayPalOrderItem } from "@/components/common/PayPalButton";
import { CodMethod } from "./CodMethod";
import { useContainerWidth } from "@/hooks/useContainerWidth";

// ── 纯逻辑函数（可测试）/ Pure logic functions (testable) ─────────────────────

/**
 * resolveInitialMethod — 找出首个 enabled 方式的 id
 * resolveInitialMethod — find the id of the first enabled method
 *
 * @param methods 支付方式列表（只需 id 和 enabled）/ list (only id + enabled needed)
 * @returns string | null
 *
 * 被引用于 / Used by: PaymentWall 初始化，以及测试文件
 */
export function resolveInitialMethod(
  methods: Array<{ id: string; enabled: boolean }>
): string | null {
  return methods.find((m) => m.enabled)?.id ?? null;
}

/**
 * 容器宽度阈值：低于此值切换为 radio button 布局
 * Container width threshold: below this value switch to radio button layout
 */
export const LAYOUT_THRESHOLD = 300;

/**
 * resolveLayout — 根据容器宽度决定使用哪种切换器布局
 * resolveLayout — determine which switcher layout to use based on container width
 *
 * @param containerWidth 容器当前宽度（px）/ current container width in px
 * @returns "tabs" | "radio"
 *
 * 被引用于 / Used by: PaymentWall 渲染逻辑，以及测试文件
 */
export function resolveLayout(containerWidth: number): "tabs" | "radio" {
  return containerWidth >= LAYOUT_THRESHOLD ? "tabs" : "radio";
}

/**
 * canSwitchMethod — 判断是否允许切换到目标支付方式
 * canSwitchMethod — determine if switching to a target method is allowed
 *
 * 规则 / Rules:
 *   - 点击已激活的 tab → 始终允许（相当于 no-op）
 *   - 当前组件未 ready → 禁止切换
 *   - 当前组件已 ready → 允许切换
 *
 * @param opts.isCurrentReady 当前激活方式是否已就绪 / whether the active method is ready
 * @param opts.targetId       目标方式 id / target method id
 * @param opts.activeId       当前激活方式 id / currently active method id
 *
 * 被引用于 / Used by: PaymentWall tab click handler，以及测试文件
 */
export function canSwitchMethod(opts: {
  isCurrentReady: boolean;
  targetId: string;
  activeId: string;
}): boolean {
  if (opts.targetId === opts.activeId) return true;
  return opts.isCurrentReady;
}

// ── 支付方式组件接口 / Payment method component interface ─────────────────────

/**
 * 每个支付方式组件必须实现的 props 接口
 * Props interface that every payment method component must implement
 *
 * onReady 是关键：组件完成异步初始化后必须调用此回调，
 * 触发 PaymentWall 解除 tab 切换锁。
 * onReady is critical: the component must call this when async init is complete
 * so PaymentWall can unlock the tab switcher.
 */
export interface PaymentMethodComponentProps {
  /** 支付金额 / Payment amount */
  amount: number;
  /** 货币代码 / Currency code */
  currency: string;
  /** 商品明细 / Order line items */
  items: PayPalOrderItem[];
  /** 支付成功回调 / Payment success callback */
  onSuccess: (orderId: string) => void;
  /** 支付失败回调 / Payment error callback */
  onError: (error: unknown) => void;
  /** 支付取消回调 / Payment cancel callback */
  onCancel: () => void;
  /**
   * 组件就绪回调（异步初始化完成后调用）
   * Called when the component's async initialization is complete
   * Unlocks the PaymentWall tab switcher
   */
  onReady: () => void;
}

// ── PayPal 支付方式包装器 / PayPal method wrapper ─────────────────────────────

/**
 * PayPalMethodWrapper — 将 PayPalButton 适配到 PaymentMethodComponentProps 接口
 * PayPalMethodWrapper — adapts PayPalButton to the PaymentMethodComponentProps interface
 *
 * PayPalButton 完成 SDK init + 按钮显示后调用 onReady，
 * PaymentWall 收到后解除 tab 禁用状态。
 *
 * 为什么用 memo？
 * PaymentWall 内部有状态（activeId、isCurrentReady），任何状态变化都会触发自身重新渲染。
 * 如果不加 memo，PayPalButton 会跟着重新渲染，useEffect 依赖数组检测到变化后
 * 会重新执行初始化流程（重新 createInstance、重新绑定 click 事件），影响支付流程。
 * memo 让 PayPalButton 在 props 未变时跳过重新渲染，保持 SDK 实例稳定。
 *
 * 注意：memo 只在"组件已存在、父组件重新渲染"时生效。
 * 用户离开 checkout 页面再回来，组件整体卸载重挂载，memo 无法介入，此时必然重建实例。
 * （但 PayPal script 标签是单例，不会重复加载）
 *
 * Why memo?
 * PaymentWall has internal state (activeId, isCurrentReady). Any state change re-renders it.
 * Without memo, PayPalButton would re-render too, triggering its useEffect to re-run
 * (re-createInstance, re-bind click), disrupting the payment flow.
 * memo skips re-render when props are unchanged, keeping the SDK instance stable.
 *
 * Note: memo only helps when the component already exists and its parent re-renders.
 * Navigating away and back causes a full unmount/remount — memo cannot intervene,
 * so the SDK instance is always rebuilt on re-entry. (The PayPal script tag itself
 * is a singleton and is never reloaded.)
 */
const PayPalMethodWrapper = memo(function PayPalMethodWrapper({
  amount,
  currency,
  items,
  onSuccess,
  onError,
  onCancel,
  onReady,
}: PaymentMethodComponentProps) {
  return (
    <PayPalButton
      amount={amount}
      currency={currency}
      items={items}
      minHeight="50px"
      onSuccess={onSuccess}
      onError={onError}
      onCancel={onCancel}
      onReady={onReady}
    />
  );
});

/**
 * 支付方式 id → React 组件的映射表
 * Map of payment method id → React component
 *
 * 新增支付方式时在此注册。
 * Register new payment methods here.
 */
const METHOD_COMPONENTS: Partial<
  Record<PaymentMethodId, React.ComponentType<PaymentMethodComponentProps>>
> = {
  paypal: PayPalMethodWrapper,
  cod: CodMethod,
  // card: CardMethodWrapper,      // 待实现 / TODO
  // alipay: AlipayMethodWrapper,  // 待实现 / TODO
  // wechat_pay: WechatPayWrapper, // 待实现 / TODO
};

// ── PaymentWall Props ─────────────────────────────────────────────────────────

export interface PaymentWallProps {
  /** 支付金额（所有商品小计）/ Payment amount (cart subtotal) */
  amount: number;
  /** 货币代码 / Currency code */
  currency?: string;
  /** 购物车商品明细 / Cart line items */
  items: PayPalOrderItem[];
  /** 支付成功回调 / Payment success callback */
  onSuccess: (orderId: string) => void;
  /** 支付失败回调 / Payment error callback */
  onError?: (error: unknown) => void;
  /** 支付取消回调 / Payment cancel callback */
  onCancel?: () => void;
}

// ── PaymentWall 组件 / Component ──────────────────────────────────────────────

/**
 * PaymentWall — 支付墙主组件
 * PaymentWall — main payment wall component
 *
 * 渲染 tab 切换器 + 当前选中的支付方式组件。
 * 在当前方式的异步初始化完成前，其余 tab 处于禁用状态（显示 spinner）。
 *
 * Renders a tab switcher + the currently selected payment component.
 * Other tabs are disabled (spinner shown) until the active method finishes async init.
 */
export function PaymentWall({
  amount,
  currency = "USD",
  items,
  onSuccess,
  onError,
  onCancel,
}: PaymentWallProps) {
  const locale = useLocale() as "zh" | "en";
  const enabledMethods = getEnabledMethods();

  // 测量容器实际宽度，决定使用 tabs 还是 radio 布局
  // Measure actual container width to decide between tabs and radio layout
  const { ref: containerRef, width: containerWidth } = useContainerWidth();
  const layout = resolveLayout(containerWidth);

  const [activeId, setActiveId] = useState<string | null>(
    () => resolveInitialMethod(enabledMethods)
  );

  const [isCurrentReady, setIsCurrentReady] = useState(false);

  const handleSelect = useCallback(
    (targetId: string) => {
      if (!canSwitchMethod({ isCurrentReady, targetId, activeId: activeId ?? "" })) return;
      if (targetId === activeId) return;
      setIsCurrentReady(false);
      setActiveId(targetId);
    },
    [isCurrentReady, activeId]
  );

  const handleMethodReady = useCallback(() => setIsCurrentReady(true), []);
  const handleError = useCallback((e: unknown) => onError?.(e), [onError]);
  const handleCancel = useCallback(() => onCancel?.(), [onCancel]);

  const ActiveComponent = activeId
    ? METHOD_COMPONENTS[activeId as PaymentMethodId]
    : null;

  // ── 无可用支付方式 / No enabled methods ────────────────────────────────────
  if (enabledMethods.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-gray-400">
        {locale === "zh" ? "暂无可用支付方式" : "No payment methods available"}
      </div>
    );
  }

  const showSwitcher = enabledMethods.length > 1;

  return (
    <div ref={containerRef} className="space-y-3">

      {/* ── Tab 布局（宽容器）/ Tab layout (wide container) ── */}
      {showSwitcher && layout === "tabs" && (
        <div
          className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl"
          role="tablist"
          aria-label={locale === "zh" ? "选择支付方式" : "Select payment method"}
        >
          {enabledMethods.map((method) => {
            const isActive = method.id === activeId;
            const isDisabled = !isActive && !isCurrentReady;
            return (
              <button
                key={method.id}
                role="tab"
                aria-selected={isActive}
                aria-disabled={isDisabled}
                disabled={isDisabled}
                onClick={() => handleSelect(method.id)}
                className={[
                  "relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                    : isDisabled
                    ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
                ].join(" ")}
              >
                {isActive && !isCurrentReady && (
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                )}
                <span>{method.label[locale]}</span>
                {method.badge && isActive && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-full font-semibold">
                    {method.badge[locale]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Radio 布局（窄容器）/ Radio layout (narrow container) ── */}
      {showSwitcher && layout === "radio" && (
        <fieldset className="space-y-2">
          <legend className="sr-only">
            {locale === "zh" ? "选择支付方式" : "Select payment method"}
          </legend>
          {enabledMethods.map((method) => {
            const isActive = method.id === activeId;
            const isDisabled = !isActive && !isCurrentReady;
            return (
              <label
                key={method.id}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all",
                  isActive
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-950"
                    : isDisabled
                    ? "border-gray-200 dark:border-gray-700 opacity-40 cursor-not-allowed"
                    : "border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={method.id}
                  checked={isActive}
                  disabled={isDisabled}
                  onChange={() => handleSelect(method.id)}
                  className="accent-primary-600 w-4 h-4 shrink-0"
                />
                <span className={[
                  "flex-1 text-sm font-medium",
                  isActive
                    ? "text-primary-700 dark:text-primary-300"
                    : "text-gray-700 dark:text-gray-300",
                ].join(" ")}>
                  {method.label[locale]}
                </span>
                {/* 加载中 spinner / Loading spinner */}
                {isActive && !isCurrentReady && (
                  <span className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin shrink-0" />
                )}
                {/* 推荐徽标 / Recommended badge */}
                {method.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-full font-semibold shrink-0">
                    {method.badge[locale]}
                  </span>
                )}
              </label>
            );
          })}
        </fieldset>
      )}

      {/* ── 当前支付方式组件 / Active payment component ── */}
      <div className="min-h-[50px]">
        {ActiveComponent ? (
          <ActiveComponent
            amount={amount}
            currency={currency}
            items={items}
            onSuccess={onSuccess}
            onError={handleError}
            onCancel={handleCancel}
            onReady={handleMethodReady}
          />
        ) : (
          <div className="text-sm text-gray-400 text-center py-4">
            {locale === "zh" ? "请选择支付方式" : "Please select a payment method"}
          </div>
        )}
      </div>

      {/* ── 加载提示 / Loading hint ── */}
      {showSwitcher && !isCurrentReady && (
        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          {locale === "zh"
            ? "支付方式加载中，请稍候再切换…"
            : "Payment method loading, please wait before switching…"}
        </p>
      )}
    </div>
  );
}
