import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/product-image";
import { formatNpr } from "@/lib/utils";
import type { ProductListItem } from "@/lib/queries";

export function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) return <Badge variant="destructive">Out of stock</Badge>;
  if (stock < 5) return <Badge variant="warning">Only {stock} left</Badge>;
  return <Badge variant="success">In stock</Badge>;
}

export function Price({ price, compareAtPrice, className }: { price: number; compareAtPrice?: number | null; className?: string }) {
  return (
    <div className={className}>
      <span className="font-semibold">{formatNpr(price)}</span>
      {compareAtPrice && compareAtPrice > price ? (
        <span className="ml-2 text-sm text-muted-foreground line-through">{formatNpr(compareAtPrice)}</span>
      ) : null}
    </div>
  );
}

export function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring"
    >
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        <ProductImage src={product.image} alt={product.name} className="transition-transform group-hover:scale-[1.02]" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="text-xs font-medium text-muted-foreground uppercase">{product.brandName}</span>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</h3>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {[product.processor, product.ramGb ? `${product.ramGb}GB RAM` : null, product.storageGb ? `${product.storageGb}GB ${product.storageType ?? ""}`.trim() : null]
            .filter(Boolean)
            .join(" · ") || "\u00A0"}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <Price price={product.price} compareAtPrice={product.compareAtPrice} />
          <StockBadge stock={product.stock} />
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: ProductListItem[] }) {
  if (!products.length) {
    return <p className="py-16 text-center text-muted-foreground">No laptops found matching your filters.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
