/**
 * @file src/config/payment-wall.ts
 * PaymentWall 配置文件 / PaymentWall configuration
 *
 * 设计说明 / Design:
 *   所有支付方式的元数据在此集中配置。PaymentWall 组件读取此配置
 *   动态渲染 tab 列表和对应的支付组件，无需修改组件本身。
 *
 *   All payment method metadata is centralized here. PaymentWall reads this
 *   config to dynamically render the tab list and corresponding components
 *   without touching the component itself.
 *
 * 新增支付方式 / Adding a new payment method:
 *   1. 在 PaymentMethodId 联合类型中添加新 id
 *   2. 在 PAYMENT_WALL_CONFIG.methods 数组中添加新条目（enabled: false 默认关闭）
 *   3. 在 PaymentWall.tsx 的 METHOD_COMPONENTS 映射中注册组件
 *
 * 被引用于 / Imported by:
 *   src/components/checkout/PaymentWall.tsx
 */

// ── 类型 / Types ──────────────────────────────────────────────────────────────

/**
 * 所有可配置的支付方式 ID
 * All configurable payment method IDs
 */
export type PaymentMethodId = "paypal" | "card" | "alipay" | "wechat_pay" | "cod";

/**
 * 单个支付方式的配置项
 * Configuration for a single payment method
 */
export interface PaymentMethodConfig {
  /** 唯一标识，与组件映射表的 key 一致 / Unique ID, matches key in component registry */
  id: PaymentMethodId;
  /** 多语言显示名称 / Bilingual display name */
  label: { zh: string; en: string };
  /** 是否启用（false = 隐藏该 tab）/ Whether enabled (false = tab hidden) */
  enabled: boolean;
  /**
   * tab 图标名（可选，传给 lucide-react 或自定义 SVG 组件名）
   * Tab icon name (optional, for lucide-react or custom SVG)
   */
  icon?: string;
  /**
   * 在 tab 标签旁显示的徽标文字（如 "推荐"）
   * Badge text displayed next to the tab label (e.g. "Recommended")
   */
  badge?: { zh: string; en: string };
}

/**
 * PaymentWall 完整配置结构
 * Full PaymentWall configuration structure
 */
export interface PaymentWallConfig {
  /** 所有支付方式列表（含 disabled，顺序即 tab 顺序）/ All methods, order = tab order */
  methods: PaymentMethodConfig[];
}

// ── Mock 配置（当前仅 PayPal 启用）────────────────────────────────────────────

/**
 * PAYMENT_WALL_CONFIG — 当前生效的支付墙配置（mock 环境）
 * PAYMENT_WALL_CONFIG — active payment wall config (mock environment)
 *
 * 生产环境可替换为从后端 API 或环境变量读取。
 * In production, replace with config fetched from backend API or env vars.
 */
export const PAYMENT_WALL_CONFIG: PaymentWallConfig = {
  methods: [
    {
      id: "paypal",
      label: { zh: "PayPal", en: "PayPal" },
      enabled: true,
      icon: "paypal",
      badge: { zh: "推荐", en: "Recommended" },
    },
    {
      id: "cod",
      label: { zh: "货到付款", en: "Cash on Delivery" },
      enabled: true,
      icon: "truck",
    },
    {
      id: "card",
      label: { zh: "信用卡 / 借记卡", en: "Credit / Debit Card" },
      enabled: false,
      icon: "credit-card",
    },
    {
      id: "alipay",
      label: { zh: "支付宝", en: "Alipay" },
      enabled: false,
      icon: "wallet",
    },
    {
      id: "wechat_pay",
      label: { zh: "微信支付", en: "WeChat Pay" },
      enabled: false,
      icon: "message-square",
    },
  ],
};

// ── 工具函数 / Utilities ──────────────────────────────────────────────────────

/**
 * getEnabledMethods — 过滤出所有 enabled=true 的支付方式
 * getEnabledMethods — filter and return all enabled payment methods
 *
 * @returns PaymentMethodConfig[] 按原始顺序排列 / in original order
 *
 * 被引用于 / Used by: src/components/checkout/PaymentWall.tsx
 */
export function getEnabledMethods(): PaymentMethodConfig[] {
  return PAYMENT_WALL_CONFIG.methods.filter((m) => m.enabled);
}
