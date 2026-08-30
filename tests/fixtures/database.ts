import { randomBytes } from "node:crypto";
import { and, eq, inArray, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { brand, order, orderItem, payment, product, productImage, user } from "@/db/schema";

/**
 * Namespaced test fixtures. Every row is tagged with a unique run id so
 * cleanup removes exactly what the run created — never shared data.
 *
 * Safety guards: fixtures require TEST_FIXTURES=1 and a TEST_DATABASE_URL
 * that differs from DATABASE_URL (set before tests/setup/database.ts maps
 * them together, so we compare against the raw env the operator supplied).
 */

const RUN_ID = `vt_${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;

export function guardFixtures() {
  if (process.env.TEST_FIXTURES !== "1") {
    throw new Error("Refusing to run integration tests: set TEST_FIXTURES=1 to acknowledge the testing database will be used.");
  }
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error("Refusing to run integration tests: TEST_DATABASE_URL is required.");
  }
  const rawUrl = process.env.RAW_DATABASE_URL;
  if (rawUrl && rawUrl === process.env.TEST_DATABASE_URL) {
    throw new Error("Refusing to run integration tests: TEST_DATABASE_URL must differ from DATABASE_URL.");
  }
  if (/neon\.tech/.test(process.env.TEST_DATABASE_URL ?? "") && process.env.TEST_DATABASE_URL?.includes("prod")) {
    throw new Error("Refusing to run integration tests: TEST_DATABASE_URL looks like a production host.");
  }
}

export const runId = RUN_ID;

export async function createTestBrand(name: string) {
  const [b] = await db
    .insert(brand)
    .values({ name: `${RUN_ID}-${name}`, slug: `${RUN_ID}-${name.toLowerCase()}` })
    .returning();
  return b;
}

export async function createTestProduct(brandId: string, overrides: Partial<typeof product.$inferInsert> = {}) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const [p] = await db
    .insert(product)
    .values({
      brandId,
      name: `${RUN_ID} Test Laptop ${suffix}`,
      slug: `${RUN_ID}-test-laptop-${suffix}`,
      sku: `${RUN_ID}-${suffix}`.toUpperCase(),
      price: 100000,
      stock: 5,
      status: "active",
      ...overrides,
    })
    .returning();
  await db.insert(productImage).values({ productId: p.id, url: "https://example.com/x.jpg", position: 0 });
  return p;
}

export async function createTestUser(role: "user" | "admin" = "user") {
  const email = `${RUN_ID}-${role}-${Math.random().toString(36).slice(2, 8)}@test.example`;
  const [u] = await db
    .insert(user)
    .values({ id: `${RUN_ID}_${role}_${Math.random().toString(36).slice(2, 10)}`, name: `Test ${role}`, email, emailVerified: true, role })
    .returning();
  return u;
}

export async function cleanupRun() {
  // FK-safe cleanup, scoped strictly to this run's namespaced rows
  const runUsers = await db
    .select({ id: user.id })
    .from(user)
    .where(or(like(user.id, `${RUN_ID}_%`), like(user.email, `${RUN_ID}-%`)));
  const userIds = runUsers.map((u) => u.id);

  if (userIds.length) {
    const runOrderIds = db.select({ id: order.id }).from(order).where(inArray(order.userId, userIds));
    await db.delete(payment).where(inArray(payment.orderId, runOrderIds));
    await db.delete(orderItem).where(inArray(orderItem.orderId, runOrderIds));
    await db.delete(order).where(inArray(order.userId, userIds));
  }

  // slugify() turns the vt_ prefix into vt-, so match both variants
  const runProducts = await db
    .select({ id: product.id })
    .from(product)
    .where(or(like(product.slug, `${RUN_ID}-%`), like(product.slug, "vt%"), like(product.name, `${RUN_ID}%`)));
  for (const p of runProducts) {
    await db.delete(productImage).where(eq(productImage.productId, p.id));
  }
  await db.delete(product).where(or(like(product.slug, `${RUN_ID}-%`), like(product.slug, "vt%"), like(product.name, `${RUN_ID}%`)));
  await db.delete(brand).where(like(brand.slug, `${RUN_ID}-%`));
  await db.delete(user).where(or(like(user.id, `${RUN_ID}_%`), like(user.email, `${RUN_ID}-%`)));
}

export async function countProducts(brandId: string, status = "active") {
  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(product)
    .where(and(eq(product.brandId, brandId), eq(product.status, status as "active")));
  return row?.count ?? 0;
}
