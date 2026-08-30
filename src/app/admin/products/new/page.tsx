import { ProductForm } from "@/components/admin/product-form";
import { db } from "@/db";
import { brand } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const brands = await db.select().from(brand).orderBy(asc(brand.name));
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add product</h1>
        <p className="text-sm text-muted-foreground">Create a new laptop listing</p>
      </div>
      <ProductForm brands={brands} />
    </div>
  );
}
