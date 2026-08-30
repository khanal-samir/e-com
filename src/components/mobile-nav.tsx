"use client";

import Link from "next/link";
import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function MobileNav({ brands }: { brands: { name: string; slug: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <MenuIcon className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>
            SS<span className="text-primary">Tech</span>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4" aria-label="Main navigation">
          <Link href="/products" className="rounded-md px-2 py-2 text-sm font-medium hover:bg-accent" onClick={() => setOpen(false)}>
            All Laptops
          </Link>
          <p className="mt-3 px-2 text-xs font-medium text-muted-foreground uppercase">Brands</p>
          {brands.map((b) => (
            <Link
              key={b.slug}
              href={`/products?brand=${b.slug}`}
              className="rounded-md px-2 py-2 text-sm hover:bg-accent"
              onClick={() => setOpen(false)}
            >
              {b.name}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
