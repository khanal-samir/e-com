"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTransition } from "react";

export interface FilterFacets {
  brands: { name: string; slug: string; count: number }[];
  rams: number[];
}

export function ProductFilters({ facets }: { facets: FilterFacets }) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
      next.delete("page");
      startTransition(() => router.push(`/products?${next.toString()}`, { scroll: false }));
    },
    [params, router],
  );

  const toggleMulti = (key: string, value: string) => {
    const current = (params.get(key) ?? "").split(",").filter(Boolean);
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    update(key, next.length ? next.join(",") : null);
  };

  const hasFilters = ["brand", "ram", "inStock", "q"].some((k) => params.get(k));

  const selectedBrands = (params.get("brand") ?? "").split(",").filter(Boolean);
  const selectedRams = (params.get("ram") ?? "").split(",").filter(Boolean);

  return (
    <aside className={cn("space-y-5", isPending && "opacity-60 pointer-events-none")} aria-label="Product filters">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filters</h2>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => startTransition(() => router.push("/products"))}>
            Clear all
          </Button>
        )}
      </div>

      <section>
        <h3 className="mb-2 text-xs font-medium text-muted-foreground uppercase">Brand</h3>
        <div className="space-y-1.5">
          {facets.brands.map((b) => (
            <label key={b.slug} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={selectedBrands.includes(b.slug)} onCheckedChange={() => toggleMulti("brand", b.slug)} aria-label={`Brand ${b.name}`} />
              {b.name}
              <span className="text-xs text-muted-foreground">({b.count})</span>
            </label>
          ))}
        </div>
      </section>

      <Separator />

      <section>
        <h3 className="mb-2 text-xs font-medium text-muted-foreground uppercase">RAM</h3>
        <div className="flex flex-wrap gap-1.5">
          {facets.rams.map((ram) => (
            <button
              key={ram}
              type="button"
              onClick={() => toggleMulti("ram", String(ram))}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs transition-colors",
                selectedRams.includes(String(ram)) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
              aria-pressed={selectedRams.includes(String(ram))}
            >
              {ram}GB
            </button>
          ))}
        </div>
      </section>

      <Separator />

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <Checkbox checked={params.get("inStock") === "1"} onCheckedChange={(c) => update("inStock", c ? "1" : null)} />
        In stock only
      </label>

    </aside>
  );
}


