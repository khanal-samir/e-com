import { db, client } from "@/db";
import { brand, product, user, order } from "@/db/schema";
import { like, or, sql } from "drizzle-orm";
async function main() {
  const brands = await db.select({ name: brand.name, slug: brand.slug }).from(brand);
  console.log("brands:", JSON.stringify(brands));
  const prods = await db.select({ slug: product.slug, brandId: product.brandId }).from(product).limit(30);
  console.log("products:", prods.map(p => p.slug).join(", "));
  const users = await db.select({ id: user.id, email: user.email }).from(user).where(or(like(user.id, "vt_%"), like(user.email, "vt_%")));
  console.log("vt users:", users.length);
  const [{ count: orderCount }] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(order);
  console.log("orders total:", orderCount);
  await client.end();
}
main();
