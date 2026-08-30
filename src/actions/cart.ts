"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { brand, cartItem, product } from "@/db/schema";
import { getSession } from "@/lib/session";

const MAX_QTY = 10;

export interface ServerCartItem {
  productId: string;
  slug: string;
  name: string;
  brandName: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  quantity: number;
}

async function loadCart(userId: string): Promise<ServerCartItem[]> {
  const rows = await db
    .select({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brandName: brand.name,
      price: product.price,
      stock: product.stock,
      quantity: cartItem.quantity,
      imageUrl: sql<string | null>`(
        select url from product_image pi where pi.product_id = ${product.id} order by pi.position asc limit 1
      )`,
    })
    .from(cartItem)
    .innerJoin(product, eq(cartItem.productId, product.id))
    .innerJoin(brand, eq(product.brandId, brand.id))
    .where(and(eq(cartItem.userId, userId), eq(product.status, "active")))
    .orderBy(cartItem.createdAt);
  return rows;
}

async function requireUserId() {
  const session = await getSession();
  if (!session) return null;
  return session.user.id;
}

/** Signed-in users only: merges a guest's local cart into the account cart. */
export async function mergeLocalCart(
  items: { productId: string; quantity: number }[],
): Promise<ServerCartItem[] | null> {
  const userId = await requireUserId();
  if (!userId) return null;

  for (const item of items) {
    const quantity = Math.min(Math.max(1, Math.floor(item.quantity) || 1), MAX_QTY);
    await db
      .insert(cartItem)
      .values({ userId, productId: item.productId, quantity })
      .onConflictDoUpdate({
        target: [cartItem.userId, cartItem.productId],
        set: {
          quantity: sql`least(${cartItem.quantity} + ${quantity}, ${MAX_QTY})`,
          updatedAt: new Date(),
        },
      });
  }
  return loadCart(userId);
}

export async function addToServerCart(productId: string, quantity: number): Promise<ServerCartItem[] | null> {
  const userId = await requireUserId();
  if (!userId) return null;
  const qty = Math.min(Math.max(1, Math.floor(quantity) || 1), MAX_QTY);
  await db
    .insert(cartItem)
    .values({ userId, productId, quantity: qty })
    .onConflictDoUpdate({
      target: [cartItem.userId, cartItem.productId],
      set: { quantity: sql`least(${cartItem.quantity} + ${qty}, ${MAX_QTY})`, updatedAt: new Date() },
    });
  return loadCart(userId);
}

export async function setServerCartQuantity(productId: string, quantity: number): Promise<ServerCartItem[] | null> {
  const userId = await requireUserId();
  if (!userId) return null;
  if (quantity <= 0) {
    await db.delete(cartItem).where(and(eq(cartItem.userId, userId), eq(cartItem.productId, productId)));
  } else {
    await db
      .update(cartItem)
      .set({ quantity: Math.min(Math.floor(quantity), MAX_QTY), updatedAt: new Date() })
      .where(and(eq(cartItem.userId, userId), eq(cartItem.productId, productId)));
  }
  return loadCart(userId);
}

export async function removeFromServerCart(productId: string): Promise<ServerCartItem[] | null> {
  const userId = await requireUserId();
  if (!userId) return null;
  await db.delete(cartItem).where(and(eq(cartItem.userId, userId), eq(cartItem.productId, productId)));
  return loadCart(userId);
}

export async function clearServerCart(): Promise<ServerCartItem[] | null> {
  const userId = await requireUserId();
  if (!userId) return null;
  await db.delete(cartItem).where(eq(cartItem.userId, userId));
  return [];
}
