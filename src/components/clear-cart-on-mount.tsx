"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart";

/** Clears the local cart once — mount this only on confirmed order pages. */
export function ClearCartOnMount() {
  const { clear } = useCart();
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
