import { db, client } from "@/db";
import { user, brand, product, productImage } from "@/db/schema";
import { sql } from "drizzle-orm";

async function main() {
  const users = await db.select({ email: user.email, role: user.role, verified: user.emailVerified }).from(user);
  console.log("users:", users);
  const brands = await db.select({ name: brand.name }).from(brand);
  console.log("brands:", brands.map((b) => b.name).join(", "));
  const [{ count: prodCount }] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(product);
  const [{ count: imgCount }] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(productImage);
  console.log("products:", prodCount, "images:", imgCount);
  await client.end();
}
main();
