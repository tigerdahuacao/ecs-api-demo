/**
 * @file src/types/paypal.d.ts
 * PayPal Web SDK v6 全局类型扩展
 * PayPal Web SDK v6 global type extensions
 *
 * 扩展 window 对象，使 TypeScript 知晓 SDK 注入的 window.paypal
 * Extends the window object so TypeScript recognizes the SDK-injected window.paypal
 *
 * 被引用于 / Referenced by:
 *   任何需要访问 window.paypal 的客户端组件
 *   Any client component that accesses window.paypal
 */

/** PayPal SDK createInstance() 的输入参数 / Input for window.paypal.createInstance() */
interface PayPalInstanceInput {
  /** 从 /api/paypal/client-token 获取的访问令牌 / Access token from /api/paypal/client-token */
  clientToken: string;
  /** 区域语言代码，如 "zh_CN"、"en_US" / Locale code e.g. "zh_CN", "en_US" */
  locale?: string;
  /** 页面类型，如 "checkout" / Page type e.g. "checkout" */
  pageType?: string;
  /** 要启用的 SDK 组件列表 / List of SDK components to enable */
  components?: string[];
}

/** PayPal SDK 实例（createInstance 的返回值）/ PayPal SDK instance (return of createInstance) */
interface PayPalInstance {
  /** 查找可用支付方式 / Find eligible payment methods */
  findEligibleMethods: (options: { currency: string }) => Promise<unknown>;
  /** 创建 PayPal 一次性支付会话 / Create a PayPal one-time payment session */
  createPayPalOneTimePaymentSession?: (options: unknown) => unknown;
  /** 创建卡片字段支付会话 / Create a card-fields payment session */
  createCardFieldsOneTimePaymentSession?: (options: unknown) => unknown;
}

/** PayPal Web Component 自定义元素的 JSX 属性 / JSX attributes for PayPal Web Component custom elements */
interface PayPalButtonElementProps extends React.HTMLAttributes<HTMLElement> {
  id?: string;
  type?: string;
  hidden?: boolean | string;
  style?: React.CSSProperties;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      /** PayPal Web SDK v6 按钮自定义元素 / PayPal Web SDK v6 button custom element */
      "paypal-button": PayPalButtonElementProps;
    }
  }

  interface Window {
    /**
     * PayPal Web SDK v6 注入的对象（SDK script 加载后可用）
     * PayPal Web SDK v6 injected object (available after SDK script loads)
     */
    paypal?: {
      createInstance: (opts: PayPalInstanceInput) => Promise<PayPalInstance>;
    };
  }
}

export {};
