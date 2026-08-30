"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Hydration-safe "are we on the client" flag. Server snapshot is always false,
 * so SSR HTML matches the first client render; React flips it after hydration
 * without any effect-ordering races.
 */
export function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
