import Link from "next/link";
import { ArrowRightIcon, ShieldCheckIcon, TruckIcon, WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/product-card";
import { HeroCarousel } from "@/components/hero-carousel";
import { getBrandsWithCounts, getFeaturedProducts, getNewArrivals } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, newArrivals, brands] = await Promise.all([
    getFeaturedProducts(4),
    getNewArrivals(8),
    getBrandsWithCounts(),
  ]);
  const activeBrands = brands.filter((b) => b.count > 0);

  const slides = [
    <div key="main" className="grid items-center gap-8 bg-muted/40 p-8 md:grid-cols-2 lg:p-12">
      <div className="space-y-4">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">SS Tech · Nepal</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Laptops for every<br />
          <span className="text-primary">Nepali student &amp; creator</span>
        </h1>
        <p className="max-w-md text-muted-foreground">
          Genuine machines with official warranty — from budget study laptops to high-refresh gaming rigs.
        </p>
        <div className="flex gap-3 pt-2">
          <Button asChild size="lg">
            <Link href="/products">
              Shop laptops <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/products?sort=price-asc">Budget picks</Link>
          </Button>
        </div>
      </div>
      <div className="hidden items-center justify-center md:flex">
        <div className="grid grid-cols-2 gap-4 text-center">
          {[
            { value: `${brands.length}+`, label: "Brands" },
            { value: "COD", label: "Cash on delivery" },
            { value: "All 7", label: "Provinces" },
            { value: "30 min", label: "Stock reserve" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border bg-background p-4">
              <p className="text-xl font-bold text-primary">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>,
    <div key="gaming" className="flex items-center justify-between gap-8 bg-foreground p-8 text-background lg:p-12">
      <div className="space-y-4">
        <p className="text-xs font-semibold tracking-widest uppercase opacity-70">Gaming season</p>
        <h2 className="max-w-lg text-3xl font-bold tracking-tight sm:text-4xl">
          RTX-powered gaming laptops<br />from Rs. 1,05,000
        </h2>
        <p className="max-w-md text-sm opacity-70">144Hz+ panels, dedicated graphics, thermal headroom that lasts.</p>
        <Button asChild size="lg" variant="secondary">
          <Link href="/products?sort=price-asc">
            Explore gaming rigs <ArrowRightIcon className="size-4" />
          </Link>
        </Button>
      </div>
      <div className="hidden shrink-0 items-center lg:flex">
        <div className="rounded-xl border border-background/20 bg-background/5 p-8 text-center">
          <p className="text-4xl font-bold">144Hz</p>
          <p className="text-xs opacity-70">high-refresh displays in stock</p>
        </div>
      </div>
    </div>,
    <div key="premium" className="flex items-center justify-between gap-8 bg-muted/60 p-8 lg:p-12">
      <div className="space-y-4">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">Work &amp; study</p>
        <h2 className="max-w-lg text-3xl font-bold tracking-tight sm:text-4xl">
          MacBooks &amp; ultrabooks,<br />all-day battery
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">Fanless M-series and efficient Core/Ryzen machines — light enough for the daily commute.</p>
        <div className="flex gap-3">
          <Button asChild size="lg">
            <Link href="/products?brand=apple">
              Shop MacBook <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/products?brand=asus,acer,msi">Gaming laptops</Link>
          </Button>
        </div>
      </div>
      <div className="hidden shrink-0 flex-col gap-3 lg:flex">
        {[
          { icon: ShieldCheckIcon, text: "Official warranty" },
          { icon: TruckIcon, text: "Nationwide delivery" },
          { icon: WalletIcon, text: "eSewa & Khalti or cash" },
        ].map((f) => (
          <div key={f.text} className="flex items-center gap-2 rounded-lg border bg-background px-4 py-2.5 text-sm">
            <f.icon className="size-4 text-primary" />
            {f.text}
          </div>
        ))}
      </div>
    </div>,
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 py-8">
      <HeroCarousel slides={slides} />

      {/* Brands */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Shop by brand</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {activeBrands.map((b) => (
            <Link
              key={b.id}
              href={`/products?brand=${b.slug}`}
              className="rounded-lg border px-4 py-3 text-center transition-colors hover:border-primary hover:bg-accent"
            >
              <p className="text-sm font-medium">{b.name}</p>
              <p className="text-xs text-muted-foreground">{b.count} laptops</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Featured laptops</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/products">
                View all <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </div>
          <ProductGrid products={featured} />
        </section>
      )}

      {/* New arrivals */}
      {newArrivals.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">New arrivals</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/products?sort=newest">
                View all <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </div>
          <ProductGrid products={newArrivals} />
        </section>
      )}
    </div>
  );
}
