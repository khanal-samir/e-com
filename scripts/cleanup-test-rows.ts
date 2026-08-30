/**
 * One-off cleanup of leftover namespaced test rows (runs that crashed before
 * afterAll cleanup). Only touches rows tagged with the vt_ fixture prefix.
 * Run: bunx tsx --env-file=.env.local scripts/cleanup-test-rows.ts
 */
import { eq, inArray, like, or, sql } from "drizzle-orm";
import { db, client } from "@/db";
import { brand, order, orderItem, payment, product, productImage, user } from "@/db/schema";

async function main() {
  const runUsers = await db
    .select({ id: user.id })
    .from(user)
    .where(or(like(user.id, "vt_%"), like(user.email, "vt_%")));
  const userIds = runUsers.map((u) => u.id);
  console.log(`found ${userIds.length} test users`);

  if (userIds.length) {
    const orderIds = db.select({ id: order.id }).from(order).where(inArray(order.userId, userIds));
    await db.delete(payment).where(inArray(payment.orderId, orderIds));
    await db.delete(orderItem).where(inArray(orderItem.orderId, orderIds));
    await db.delete(order).where(inArray(order.userId, userIds));
  }

  const runProducts = await db
  .select({ id: product.id })
  .from(product)
  .where(or(like(product.slug, "vt_%"), like(product.slug, "vt%"), like(product.name, "vt_%")));
  console.log(`found ${runProducts.length} test products`);
  for (const p of runProducts) {
    await db.delete(productImage).where(eq(productImage.productId, p.id));
  }
  await db.delete(product).where(or(like(product.slug, "vt%"), like(product.name, "vt_%")));
  await db.delete(brand).where(like(brand.slug, "vt_%"));
  await db.delete(user).where(or(like(user.id, "vt_%"), like(user.email, "vt_%")));

  const [{ count }] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(brand);
  console.log(`done. brands remaining: ${count}`);
  await client.end();
}

main().catch(async (err) => {
  console.error(err);
  await client.end();
  process.exit(1);
});
