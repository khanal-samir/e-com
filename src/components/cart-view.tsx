"use client";

import Link from "next/link";
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProductImage } from "@/components/product-image";
import { useCart } from "@/lib/cart";
import { useMounted } from "@/hooks/use-mounted";
import { deliveryChargeFor } from "@/lib/pricing";
import { formatNpr } from "@/lib/utils";

export function CartView() {
  const { items, subtotal, setQuantity, removeItem, ready } = useCart();
  const mounted = useMounted();

  if (!mounted || !ready) return <p className="py-16 text-center text-muted-foreground">Loading cart…</p>;

  if (!items.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button asChild className="mt-4">
          <Link href="/products">Browse laptops</Link>
        </Button>
      </div>
    );
  }

  const delivery = deliveryChargeFor(subtotal);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.productId} className="flex gap-4 rounded-xl border p-4">
            <Link href={`/products/${item.slug}`} className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
              <ProductImage src={item.imageUrl} alt={item.name} sizes="80px" />
            </Link>
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase">{item.brandName}</span>
              <Link href={`/products/${item.slug}`} className="text-sm font-medium hover:underline">
                {item.name}
              </Link>
              <p className="text-sm font-semibold">{formatNpr(item.price)}</p>
            </div>
            <div className="flex flex-col items-end justify-between">
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => removeItem(item.productId)} aria-label={`Remove ${item.name}`}>
                <Trash2Icon className="size-4" />
              </Button>
              <div className="flex items-center rounded-md border" role="group" aria-label={`Quantity for ${item.name}`}>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setQuantity(item.productId, item.quantity - 1)} aria-label="Decrease quantity">
                  <MinusIcon className="size-3.5" />
                </Button>
                <span className="w-7 text-center text-sm">{item.quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setQuantity(item.productId, item.quantity + 1)}
                  disabled={item.quantity >= Math.min(item.stock, 10)}
                  aria-label="Increase quantity"
                >
                  <PlusIcon className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="h-fit rounded-xl border p-6">
        <h2 className="mb-4 font-semibold">Order summary</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatNpr(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Delivery</dt>
            <dd>{delivery === 0 ? "Free" : formatNpr(delivery)}</dd>
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd>{formatNpr(subtotal + delivery)}</dd>
          </div>
        </dl>
        <Button asChild className="mt-5 w-full" size="lg">
          <Link href="/checkout">Proceed to checkout</Link>
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">Payment via eSewa (test mode)</p>
      </div>
    </div>
  );
}
