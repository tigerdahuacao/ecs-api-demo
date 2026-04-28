"use client";

import { useEffect } from "react";
import { initCartStore } from "@/store/cart";

// Initializes cart from sessionStorage on mount (client-only)
export function CartInitializer() {
  useEffect(() => {
    initCartStore();
  }, []);

  return null;
}
