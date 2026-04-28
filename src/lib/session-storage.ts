/**
 * @file src/lib/session-storage.ts
 * sessionStorage 工具函数 / sessionStorage utility functions
 *
 * 作用 / Purpose:
 *   封装对浏览器 sessionStorage 的所有读写操作，用于：
 *   1. 持久化匿名用户的 sessionId（标识同一购物会话）
 *   2. 缓存购物车数据（防止页面刷新丢失）
 *
 *   Wraps all reads and writes to the browser sessionStorage for:
 *   1. Persisting the anonymous user's sessionId (identifies the shopping session)
 *   2. Caching cart data (prevents loss on page refresh)
 *
 * 注意 / Note:
 *   所有函数都有 `typeof window === "undefined"` 的 SSR 保护，
 *   因为 sessionStorage 只在浏览器中存在。
 *   All functions guard against SSR with `typeof window === "undefined"` checks,
 *   since sessionStorage only exists in the browser.
 *
 * 被引用于 / Imported by:
 *   - src/store/cart.ts（initCartStore 从此处恢复购物车）
 *   - src/components/product/ProductDetail.tsx（加购时传递 sessionId）
 *   - src/components/cart/CartView.tsx（拉取购物车 API 时传递 sessionId）
 *   - src/components/checkout/CheckoutView.tsx（拉取购物车 API 时传递 sessionId）
 *   - src/components/cart/RecommendationCard.tsx
 *   - src/components/checkout/ImpulseItem.tsx
 */
import type { CartItem } from "@/types";

/** sessionStorage 中存储 sessionId 的 key */
const SESSION_KEY = "ecs_session_id";
/** sessionStorage 中存储购物车数据的 key */
const CART_KEY = "ecs_cart_items";

/**
 * 获取（或创建）当前会话的唯一 ID
 * Get (or create) the unique ID for the current shopping session
 *
 * 逻辑 / Logic:
 *   - 若 sessionStorage 中已有 ID 则直接返回（同一标签页内保持不变）
 *   - 否则生成新的 UUID 并写入 sessionStorage
 *   - 关闭标签页后 sessionStorage 清空，下次访问重新生成
 *
 * @returns sessionId 字符串，SSR 时返回空字符串 / sessionId string, empty string on SSR
 * 调用方 / Called by: 所有需要将请求关联到购物会话的地方（加购、拉取购物车等）
 */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

/**
 * 从 sessionStorage 读取购物车缓存
 * Read the cached cart items from sessionStorage
 *
 * @returns 购物车条目数组；解析失败或 SSR 时返回空数组
 *          Array of cart items; returns [] on parse failure or SSR
 * 调用方 / Called by: src/store/cart.ts → initCartStore()
 */
export function getCachedCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * 将购物车数据写入 sessionStorage 缓存
 * Write cart items to sessionStorage cache
 *
 * @param items 要缓存的购物车条目数组 / Cart items array to cache
 * 调用方 / Called by: src/store/cart.ts 中所有修改 items 的 action（setItems、addItem、updateQuantity、removeItem）
 */
export function setCachedCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CART_KEY, JSON.stringify(items));
}

/**
 * 清空购物车缓存（下单完成后调用）
 * Clear the cart cache (called after order placement)
 *
 * 调用方 / Called by: src/store/cart.ts → clearCart()
 */
export function clearCachedCart(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CART_KEY);
}
