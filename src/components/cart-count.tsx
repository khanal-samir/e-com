"use client";

import { useCart } from "@/lib/cart";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

export function CartCount() {
  const { count, ready } = useCart();
  const mounted = useMounted();
  // rendered only after hydration — localStorage-backed count must never
  // participate in the SSR HTML comparison
  if (!mounted || !ready || count === 0) return null;
  return (
    <span
      className={cn(
        "absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground",
      )}
    >
      {count}
    </span>
  );
}
