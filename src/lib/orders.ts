import crypto from "node:crypto";
import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { order, orderItem, payment, product } from "@/db/schema";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export { deliveryChargeFor, DELIVERY_CHARGE, FREE_DELIVERY_THRESHOLD, ORDER_EXPIRY_MINUTES } from "@/lib/pricing";

export function generateOrderNumber() {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `SS-${year}-${rand}`;
}

/** Adds ordered quantities back to stock. Idempotent via stock_released_at. */
export async function releaseOrderStock(tx: Tx, orderId: string) {
  const rows = await tx
    .update(order)
    .set({ stockReleasedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(order.id, orderId), isNull(order.stockReleasedAt)))
    .returning({ id: order.id });
  if (!rows[0]) return false; // already released
  const items = await tx.select().from(orderItem).where(eq(orderItem.orderId, orderId));
  for (const item of items) {
    if (item.productId) {
      await tx
        .update(product)
        .set({ stock: sql`${product.stock} + ${item.quantity}` })
        .where(eq(product.id, item.productId));
    }
  }
  return true;
}

/** Cancels an unpaid, expired order and returns reserved stock. */
export async function releaseExpiredOrders() {
  const expired = await db
    .select({ id: order.id })
    .from(order)
    .where(
      and(
        eq(order.status, "pending_payment"),
        isNull(order.stockReleasedAt),
        lt(order.expiresAt, new Date()),
      ),
    )
    .limit(50);
  for (const o of expired) {
    await db.transaction(async (tx) => {
      const released = await releaseOrderStock(tx, o.id);
      if (released) {
        await tx
          .update(order)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(order.id, o.id));
        await tx
          .update(payment)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(and(eq(payment.orderId, o.id), inArray(payment.status, ["initiated", "pending"])));
      }
    });
  }
  return expired.length;
}

/**
 * Marks payment COMPLETE and order PAID. Idempotent: repeated callbacks and
 * refreshes cannot double-apply because both updates are guarded by the
 * previous state.
 */
export async function markPaymentComplete(params: {
  transactionUuid: string;
  transactionCode: string;
  amount: number;
  rawResponse: string;
}) {
  return db.transaction(async (tx) => {
    const pays = await tx
      .select()
      .from(payment)
      .where(eq(payment.transactionUuid, params.transactionUuid))
      .limit(1);
    const pay = pays[0];
    if (!pay) return { ok: false as const, reason: "payment_not_found" };
    if (pay.amount !== params.amount) return { ok: false as const, reason: "amount_mismatch" };
    if (pay.status === "complete") {
      return { ok: true as const, alreadyComplete: true, orderId: pay.orderId };
    }
    await tx
      .update(payment)
      .set({
        status: "complete",
        transactionCode: params.transactionCode,
        verifiedAt: new Date(),
        rawResponse: params.rawResponse,
        updatedAt: new Date(),
      })
      .where(eq(payment.id, pay.id));
    await tx
      .update(order)
      .set({ status: "paid", updatedAt: new Date() })
      .where(
        and(
          eq(order.id, pay.orderId),
          inArray(order.status, ["pending_payment", "payment_review"]),
        ),
      );
    return { ok: true as const, alreadyComplete: false, orderId: pay.orderId };
  });
}

/** Marks a payment failed and releases reserved stock (once). */
export async function markPaymentFailed(transactionUuid: string, status: "failed" | "cancelled" | "not_found" = "failed") {
  return db.transaction(async (tx) => {
    const pays = await tx
      .select()
      .from(payment)
      .where(eq(payment.transactionUuid, transactionUuid))
      .limit(1);
    const pay = pays[0];
    if (!pay) return false;
    if (pay.status === "complete") return false; // never release a paid order
    await tx
      .update(payment)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(payment.id, pay.id), inArray(payment.status, ["initiated", "pending"])));
    await releaseOrderStock(tx, pay.orderId);
    await tx
      .update(order)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(order.id, pay.orderId), eq(order.status, "pending_payment")));
    return true;
  });
}
