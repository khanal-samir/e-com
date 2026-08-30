import { Suspense } from "react";
import Link from "next/link";
import { ShoppingCartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartCount } from "@/components/cart-count";
import { MobileNav } from "@/components/mobile-nav";
import { AccountMenu } from "@/components/account-menu";
import { SearchForm } from "@/components/search-form";
import { SEED_BRANDS, brandSlug } from "@/lib/brands";

// fully synchronous — no session/DB awaits here, so the navbar paints instantly
// and only the account chip resolves its own loading state
export function SiteHeader() {
  const brands = SEED_BRANDS.map((name) => ({ name, slug: brandSlug(name) }));

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="bg-primary py-1.5 text-center text-xs font-medium text-primary-foreground">
        100% genuine laptops with official warranty · Free delivery over Rs. 1,00,000 · Easy 7-day replacement
      </div>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <MobileNav brands={brands} />
        <Link href="/" className="text-lg font-bold tracking-tight">
          SS<span className="text-primary">Tech</span>
        </Link>

        <div className="hidden flex-1 md:block">
          <Suspense fallback={<div className="h-9" />}>
            <SearchForm />
          </Suspense>
        </div>

        <nav className="ml-auto flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link href="/products">Laptops</Link>
          </Button>
          <AccountMenu />
          <Button asChild variant="ghost" size="icon" aria-label="Cart">
            <Link href="/cart" className="relative">
              <ShoppingCartIcon className="size-5" />
              <CartCount />
            </Link>
          </Button>
        </nav>
      </div>
      <div className="border-t px-4 py-2 md:hidden">
        <Suspense fallback={<div className="h-9" />}>
          <SearchForm />
        </Suspense>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} SS Tech — Laptop store for Nepal. College project.</p>
        <p>
          Payments secured by{" "}
          <span className="font-medium text-foreground">eSewa</span> &{" "}
          <span className="font-medium text-foreground">Khalti</span> (test mode)
        </p>
      </div>
    </footer>
  );
}
