"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ProductImage } from "@/components/product-image";
import type { ProductImage as ProductImageRow } from "@/db/schema";

export function ProductGallery({ images, productName }: { images: ProductImageRow[]; productName: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  if (!images.length) {
    return (
      <div className="aspect-[4/3] rounded-xl border bg-muted">
        <ProductImage src={null} alt={productName} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
        <ProductImage src={current.url} alt={current.alt ?? productName} sizes="(max-width: 1024px) 100vw, 50vw" priority />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2" role="tablist" aria-label="Product images">
          {images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              role="tab"
              aria-selected={idx === active}
              aria-label={`Image ${idx + 1}`}
              onClick={() => setActive(idx)}
              className={cn(
                "aspect-square overflow-hidden rounded-md border-2 transition-colors",
                idx === active ? "border-primary" : "border-transparent hover:border-border",
              )}
            >
              <ProductImage src={img.url} alt={img.alt ?? `${productName} thumbnail ${idx + 1}`} sizes="100px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
