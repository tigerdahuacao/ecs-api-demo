import { create } from "zustand";
import type { CartItem, CartState } from "@/types";
import {
  getCachedCart,
  setCachedCart,
  clearCachedCart,
  getSessionId,
} from "@/lib/session-storage";

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  sessionId: "",

  setItems: (items) => {
    setCachedCart(items);
    set({ items });
  },

  addItem: (item) => {
    const { items } = get();
    const existing = items.find(
      (i) =>
        i.productId === item.productId &&
        JSON.stringify(i.specs) === JSON.stringify(item.specs)
    );

    const updated = existing
      ? items.map((i) =>
          i.id === existing.id
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        )
      : [...items, item];

    setCachedCart(updated);
    set({ items: updated });
  },

  updateQuantity: (id, quantity) => {
    const updated = get().items.map((i) =>
      i.id === id ? { ...i, quantity } : i
    );
    setCachedCart(updated);
    set({ items: updated });
  },

  removeItem: (id) => {
    const updated = get().items.filter((i) => i.id !== id);
    setCachedCart(updated);
    set({ items: updated });
  },

  clearCart: () => {
    clearCachedCart();
    set({ items: [] });
  },

  totalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  totalPrice: () =>
    get().items.reduce(
      (sum, i) => sum + (i.product?.price ?? 0) * i.quantity,
      0
    ),
}));

// Initialize from sessionStorage on client
export function initCartStore() {
  const sessionId = getSessionId();
  const items = getCachedCart();
  useCartStore.setState({ sessionId, items });
}
