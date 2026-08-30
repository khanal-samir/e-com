import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { ProductGrid } from "@/components/product-card";
import { ProductFilters } from "@/components/product-filters";
import { getBrandsWithCounts, getFilterFacets, searchProducts } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Laptops",
  description: "Browse laptops available at SS Tech — filter by brand, price, RAM and storage.",
};

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Name A–Z" },
];

interface ProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const brandParam = asArray(sp.brand).join(",");
  const brands = brandParam ? brandParam.split(",").filter(Boolean) : undefined;
  const ramParam = asArray(sp.ram).join(",");
  const ram = ramParam ? ramParam.split(",").map(Number).filter((n) => Number.isFinite(n)) : undefined;
  const minPrice = sp.minPrice ? Number(sp.minPrice) : undefined;
  const maxPrice = sp.maxPrice ? Number(sp.maxPrice) : undefined;
  const storageType = typeof sp.storageType === "string" && sp.storageType ? sp.storageType : undefined;
  const sort = (typeof sp.sort === "string" && SORTS.some((s) => s.value === sp.sort) ? sp.sort : "newest") as
    | "newest"
    | "price-asc"
    | "price-desc"
    | "name";
  const page = Math.max(1, Number(sp.page) || 1);
  const inStock = sp.inStock === "1";

  const [results, brandFacets, facets] = await Promise.all([
    searchProducts({ q, brands, ram, minPrice, maxPrice, storageType, sort, page, inStock }),
    getBrandsWithCounts(),
    getFilterFacets(),
  ]);

  const activeBrandNames = (brands ?? [])
    .map((slug) => brandFacets.find((b) => b.slug === slug)?.name)
    .filter(Boolean)
    .join(", ");

  const buildPageUrl = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (typeof v === "string" && v && k !== "page") next.set(k, v);
    }
    if (p > 1) next.set("page", String(p));
    const qs = next.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {q ? `Search results for “${q}”` : activeBrandNames || "All laptops"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {results.total} product{results.total === 1 ? "" : "s"} found
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <Suspense fallback={<div className="h-96 rounded-lg bg-muted" />}>
          <ProductFilters
            facets={{
              brands: brandFacets.map((b) => ({ name: b.name, slug: b.slug, count: b.count })),
              rams: facets.rams,
            }}
          />
        </Suspense>

        <div className="space-y-6">
          <div className="flex items-center justify-end gap-2">
            <label htmlFor="sort" className="text-sm text-muted-foreground">
              Sort by
            </label>
            <form action="/products" method="get" className="flex items-center gap-2">
              {/* preserve existing filters */}
              {Object.entries(sp)
                .filter(([k, v]) => k !== "sort" && typeof v === "string" && v)
                .map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v as string} />
                ))}
              <select
                id="sort"
                name="sort"
                defaultValue={sort}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button type="submit" className="hidden" aria-hidden />
            </form>
          </div>

          <Suspense fallback={<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <div key={i} className="aspect-[3/4] rounded-xl bg-muted" />)}
          </div>}>
            <ProductGrid products={results.items} />
          </Suspense>

          {results.totalPages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-center gap-1 pt-4">
              {Array.from({ length: results.totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={buildPageUrl(p)}
                  aria-current={p === results.page ? "page" : undefined}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md border text-sm transition-colors",
                    p === results.page ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
                  )}
                >
                  {p}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
