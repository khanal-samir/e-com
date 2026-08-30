import Link from "next/link";
import { PencilIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductImage } from "@/components/product-image";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { getAdminProducts } from "@/lib/queries";
import { cn, formatNpr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const products = await getAdminProducts(q);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">{products.length} products</p>
        </div>
        <div className="flex gap-2">
          <form action="/admin/products" method="get" className="flex gap-2">
            <Input name="q" defaultValue={q} placeholder="Search products…" className="w-48" aria-label="Search products" />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
          <Button asChild>
            <Link href="/admin/products/new">
              <PlusIcon className="size-4" /> Add product
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Product</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Photos</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!products.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No products found. Add your first laptop.
                </TableCell>
              </TableRow>
            )}
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="pl-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                      <ProductImage src={p.image} alt={p.name} sizes="40px" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{p.brandName}</TableCell>
                <TableCell>
                  <span className={cn("text-sm", p.imageCount === 0 && "font-medium text-destructive")}>
                    {p.imageCount}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{formatNpr(p.price)}</TableCell>
                <TableCell>
                  <span className={p.stock < 5 ? "font-medium text-destructive" : "text-sm"}>{p.stock}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={p.status === "active" ? "success" : p.status === "draft" ? "warning" : "secondary"}>
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell className="pr-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button asChild variant="ghost" size="icon" aria-label={`Edit ${p.name}`}>
                      <Link href={`/admin/products/${p.id}/edit`}>
                        <PencilIcon className="size-4" />
                      </Link>
                    </Button>
                    <ProductRowActions productId={p.id} status={p.status} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
