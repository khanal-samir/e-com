"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MinusIcon, PlusIcon, ShoppingCartIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import type { Product } from "@/db/schema";

interface AddToCartProps {
  product: Pick<Product, "id" | "slug" | "name" | "price" | "stock">;
  brandName: string;
  image?: string | null;
  withQuantity?: boolean;
}

export function AddToCartButton({ product, brandName, image, withQuantity = false }: AddToCartProps) {
  const { addItem } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const max = Math.min(product.stock, 10);

  const add = () => {
    if (product.stock <= 0) return;
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        brandName,
        price: product.price,
        stock: product.stock,
        imageUrl: image ?? null,
      },
      quantity,
    );
    toast.success(`${product.name} added to cart`);
  };

  if (product.stock <= 0) {
    return (
      <Button variant="secondary" disabled className="w-full">
        Out of stock
      </Button>
    );
  }

  return (
    <div className={withQuantity ? "flex flex-col gap-3 sm:flex-row" : ""}>
      {withQuantity && (
        <div className="flex h-9 w-fit items-center rounded-md border" role="group" aria-label="Quantity">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            <MinusIcon className="size-4" />
          </Button>
          <span className="w-8 text-center text-sm" aria-live="polite">
            {quantity}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={() => setQuantity((q) => Math.min(max, q + 1))}
            disabled={quantity >= max}
            aria-label="Increase quantity"
          >
            <PlusIcon className="size-4" />
          </Button>
        </div>
      )}
      <Button onClick={add} className={withQuantity ? "flex-1" : ""} size={withQuantity ? "lg" : "sm"}>
        <ShoppingCartIcon className="size-4" />
        Add to cart
      </Button>
      {withQuantity && (
        <Button variant="outline" size="lg" onClick={() => { add(); router.push("/checkout"); }}>
          Buy now
        </Button>
      )}
    </div>
  );
}
