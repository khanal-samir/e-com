import { eq, like } from "drizzle-orm";
import { db, client } from "@/db";
import { brand, product, productImage } from "@/db/schema";
async function main() {
  const rows = await db.select({ id: product.id }).from(product).where(like(product.slug, "admin-test-laptop%"));
  for (const p of rows) {
    await db.delete(productImage).where(eq(productImage.productId, p.id));
    await db.delete(product).where(eq(product.id, p.id));
  }
  console.log(`deleted ${rows.length} leftover products`);
  const brands = await db.select({ id: brand.id }).from(brand).where(like(brand.slug, "vt_%"));
  for (const b of brands) {
    await db.delete(brand).where(eq(brand.id, b.id));
  }
  console.log(`deleted ${brands.length} test brands`);
  await client.end();
}
main();
