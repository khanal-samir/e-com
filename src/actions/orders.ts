"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { order, payment } from "@/db/schema";
import { releaseOrderStock } from "@/lib/orders";
import { getSession, isAdmin } from "@/lib/session";

const FULFILMENT_FLOW: Record<string, string[]> = {
  paid: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  pending_payment: [],
  payment_review: [],
};

export async function updateOrderStatus(orderId: string, nextStatus: string) {
  const session = await getSession();
  if (!isAdmin(session)) return { ok: false as const, error: "Unauthorized" };

  const rows = await db.select().from(order).where(eq(order.id, orderId)).limit(1);
  const current = rows[0];
  if (!current) return { ok: false as const, error: "Order not found" };
  if (!FULFILMENT_FLOW[current.status]?.includes(nextStatus)) {
    return { ok: false as const, error: `Cannot move order from ${current.status} to ${nextStatus}` };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(order)
      .set({ status: nextStatus as typeof order.$inferInsert.status, updatedAt: new Date() })
      .where(eq(order.id, orderId));
    if (nextStatus === "cancelled") {
      await releaseOrderStock(tx, orderId);
      await tx
        .update(payment)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
          and(
            eq(payment.orderId, orderId),
            inArray(payment.status, ["initiated", "pending"]),
          ),
        );
    }
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true as const };
}
