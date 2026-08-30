import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRightIcon } from "lucide-react";
import { ProductGrid, Price, StockBadge } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { getProductBySlug, getRelatedProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.shortDescription ?? `Buy ${product.name} at SS Tech with eSewa payment and delivery across Nepal.`,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, product.brandId);

  const specs: [string, string | null | undefined][] = [
    ["Processor", product.processor],
    ["Graphics", product.graphics],
    ["RAM", product.ramGb ? `${product.ramGb} GB` : null],
    ["Storage", product.storageGb ? `${product.storageGb} GB ${product.storageType ?? ""}`.trim() : null],
    ["Display", [product.screenSize, product.refreshRate].filter(Boolean).join(" · ") || null],
    ["Operating system", product.operatingSystem],
    ["Warranty", product.warranty],
    ["SKU", product.sku],
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRightIcon className="size-3.5" />
        <Link href="/products" className="hover:text-foreground">Laptops</Link>
        <ChevronRightIcon className="size-3.5" />
        <Link href={`/products?brand=${product.brandSlug}`} className="hover:text-foreground">{product.brandName}</Link>
        <ChevronRightIcon className="size-3.5" />
        <span className="truncate text-foreground" aria-current="page">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />

        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase">{product.brandName}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{product.name}</h1>
            {product.shortDescription && <p className="mt-2 text-muted-foreground">{product.shortDescription}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Price price={product.price} compareAtPrice={product.compareAtPrice} className="text-2xl" />
            <StockBadge stock={product.stock} />
          </div>

          <AddToCartButton product={product} brandName={product.brandName} image={product.images[0]?.url ?? null} withQuantity />

          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            <ul className="space-y-1.5">
              <li>· Payment via eSewa (test mode)</li>
              <li>· Free delivery on orders over Rs. 1,00,000</li>
              <li>· Stock reserved for 30 minutes at checkout</li>
            </ul>
          </div>

          {product.description && (
            <section>
              <h2 className="mb-2 font-semibold">Description</h2>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{product.description}</p>
            </section>
          )}
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Specifications</h2>
        <dl className="grid gap-x-8 gap-y-3 rounded-xl border p-6 sm:grid-cols-2">
          {specs
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b pb-2 text-sm last:border-0">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
        </dl>
      </section>

      {related.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">You may also like</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
