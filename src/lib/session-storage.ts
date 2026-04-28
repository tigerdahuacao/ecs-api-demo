import type { CartItem } from "@/types";

const SESSION_KEY = "ecs_session_id";
const CART_KEY = "ecs_cart_items";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function getCachedCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function setCachedCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function clearCachedCart(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CART_KEY);
}
