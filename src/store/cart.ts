/**
 * @file src/store/cart.ts
 * Zustand 购物车全局状态 / Zustand global cart store
 *
 * 作用 / Purpose:
 *   管理购物车的客户端状态。数据来源有两处：
 *   1. API 响应（CartView / CheckoutView 调用 GET /api/cart 后通过 setItems 写入）
 *   2. sessionStorage 缓存（页面刷新后由 initCartStore 恢复）
 *
 *   Manages the client-side cart state. Data flows from two sources:
 *   1. API responses (CartView/CheckoutView calls GET /api/cart, then calls setItems)
 *   2. sessionStorage cache (restored by initCartStore after page refresh)
 *
 *   每次修改都会同步写入 sessionStorage，确保刷新页面不丢失数据。
 *   Every mutation also writes to sessionStorage to survive page refreshes.
 *
 * 被引用于 / Imported by:
 *   - src/components/common/CartInitializer.tsx（初始化）
 *   - src/components/common/Navbar.tsx（读取 totalCount 显示 Badge）
 *   - src/components/product/ProductDetail.tsx（addItem）
 *   - src/components/cart/CartView.tsx（setItems、updateQuantity、removeItem）
 *   - src/components/cart/RecommendationCard.tsx（addItem）
 *   - src/components/checkout/CheckoutView.tsx（setItems、clearCart）
 *   - src/components/checkout/ImpulseItem.tsx（addItem）
 */
import { create } from "zustand";
import type { CartItem, CartState } from "@/types";
import {
  getCachedCart,
  setCachedCart,
  clearCachedCart,
  getSessionId,
} from "@/lib/session-storage";

/**
 * useCartStore — 全局购物车 Zustand store
 * useCartStore — the global Zustand cart store
 *
 * 使用方式 / Usage:
 *   const items = useCartStore((s) => s.items);         // 订阅 items
 *   const addItem = useCartStore((s) => s.addItem);     // 取出 action
 *   const count = useCartStore((s) => s.totalCount());  // 调用计算函数
 */
export const useCartStore = create<CartState>((set, get) => ({
  /** 购物车商品列表，初始为空，由 initCartStore 或 setItems 填充 / Initially empty */
  items: [],
  /** 匿名用户会话 ID，由 initCartStore 从 sessionStorage 读取 / Read from sessionStorage by initCartStore */
  sessionId: "",

  /**
   * setItems — 用 API 返回的完整列表替换购物车
   * setItems — replace cart with the full list from API
   *
   * 调用方 / Called by:
   *   CartView.fetchCart() 在 GET /api/cart 成功后调用
   *   CheckoutView.fetchData() 在 GET /api/cart 成功后调用
   *
   * @param items 服务端返回的购物车条目（含 product 关联数据）
   *              Cart items from server (with embedded product data)
   */
  setItems: (items) => {
    setCachedCart(items);   // 同步写入 sessionStorage / Sync to sessionStorage
    set({ items });
  },

  /**
   * addItem — 加购一个条目（相同 productId+specs 则合并数量）
   * addItem — add one item (merges quantity if same productId+specs)
   *
   * 匹配逻辑 / Matching logic:
   *   用 JSON.stringify 对 specs 深比较，相同则累加 quantity，否则追加新条目。
   *   Deep-compares specs via JSON.stringify; same specs → increment qty; else → append.
   *
   * 调用方 / Called by:
   *   ProductDetail.handleAddToCart()
   *   RecommendationCard.handleAdd()
   *   ImpulseItem.handleAdd()
   *
   * @param item POST /api/cart 返回的新条目 / New item returned by POST /api/cart
   */
  addItem: (item) => {
    const { items } = get();
    // 检查是否已存在相同商品+规格的条目 / Check if same product+specs already exists
    const existing = items.find(
      (i) =>
        i.productId === item.productId &&
        JSON.stringify(i.specs) === JSON.stringify(item.specs)
    );

    const updated = existing
      ? items.map((i) =>
          i.id === existing.id
            ? { ...i, quantity: i.quantity + item.quantity }  // 合并数量 / Merge quantity
            : i
        )
      : [...items, item];   // 追加新条目 / Append new item

    setCachedCart(updated);
    set({ items: updated });
  },

  /**
   * updateQuantity — 修改指定条目的数量
   * updateQuantity — update quantity for a specific item
   *
   * 调用方 / Called by:
   *   CartView.handleQuantityChange()（乐观更新，先改 store 再调 PATCH API）
   *
   * @param id CartItem.id
   * @param quantity 新数量（已由调用方保证 >= 1）/ New quantity (caller ensures >= 1)
   */
  updateQuantity: (id, quantity) => {
    const updated = get().items.map((i) =>
      i.id === id ? { ...i, quantity } : i
    );
    setCachedCart(updated);
    set({ items: updated });
  },

  /**
   * removeItem — 从购物车删除指定条目
   * removeItem — remove a specific item from the cart
   *
   * 调用方 / Called by:
   *   CartView.handleRemove()（乐观更新，先改 store 再调 DELETE API）
   *
   * @param id CartItem.id
   */
  removeItem: (id) => {
    const updated = get().items.filter((i) => i.id !== id);
    setCachedCart(updated);
    set({ items: updated });
  },

  /**
   * clearCart — 清空购物车（下单后调用）
   * clearCart — clear the entire cart (called after order placement)
   *
   * 调用方 / Called by:
   *   CheckoutView.handlePlaceOrder() 在模拟下单成功后调用
   */
  clearCart: () => {
    clearCachedCart();
    set({ items: [] });
  },

  /**
   * totalCount — 计算购物车总件数（所有条目 quantity 之和）
   * totalCount — compute total item count (sum of all quantities)
   *
   * 返回值用于 Navbar 的购物车 Badge 数字显示
   * Return value is used for the shopping cart badge in Navbar
   *
   * 调用方 / Called by: Navbar.tsx
   */
  totalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  /**
   * totalPrice — 计算购物车总金额
   * totalPrice — compute total price of the cart
   *
   * 注意 / Note:
   *   price 来自关联的 product 对象，若 product 未加载则计为 0
   *   Price comes from the associated product object; defaults to 0 if product not loaded
   *
   * 调用方 / Called by: 目前 CartView 自行计算，此方法保留供需要时使用
   */
  totalPrice: () =>
    get().items.reduce(
      (sum, i) => sum + (i.product?.price ?? 0) * i.quantity,
      0
    ),
}));

/**
 * initCartStore — 从 sessionStorage 恢复购物车状态
 * initCartStore — restore cart state from sessionStorage
 *
 * 作用 / Purpose:
 *   在客户端首次挂载时（CartInitializer.useEffect）调用，
 *   将 sessionStorage 中缓存的 sessionId 和购物车条目写入 Zustand store。
 *   Called on first client mount (in CartInitializer.useEffect) to restore
 *   the cached sessionId and cart items from sessionStorage into the Zustand store.
 *
 * 为什么不在 create() 内部直接初始化？
 * Why not initialize inside create()?
 *   create() 在模块加载时同步执行，而 sessionStorage 只在浏览器客户端存在。
 *   在 SSR 阶段，sessionStorage 不可用，直接调用会报错。
 *   通过 useEffect 延迟到客户端挂载后执行可以安全避免 SSR 错误。
 *   create() runs synchronously at module load time, but sessionStorage only
 *   exists in the browser. Calling it during SSR would throw. Deferring to
 *   useEffect ensures this only runs on the client.
 *
 * 调用方 / Called by: src/components/common/CartInitializer.tsx
 */
export function initCartStore() {
  const sessionId = getSessionId();
  const items = getCachedCart();
  useCartStore.setState({ sessionId, items });
}
