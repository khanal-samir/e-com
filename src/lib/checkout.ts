import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { order, orderItem, payment, product, productImage } from "@/db/schema";
import { deliveryChargeFor, generateOrderNumber, ORDER_EXPIRY_MINUTES, releaseExpiredOrders } from "@/lib/orders";

export interface CheckoutItem {
  productId: string;
  quantity: number;
}

export interface ShippingInfo {
  customerName: string;
  email: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  notes?: string | null;
}

export type CreateOrderResult =
  | { ok: true; orderNumber: string; transactionUuid?: string; total: number; subtotal: number; deliveryCharge: number; cod: boolean }
  | { ok: false; error: string };

/**
 * Creates a pending order, snapshots items/prices from the database and
 * reserves stock. Client-supplied prices/quantities are never trusted.
 */
export async function createPendingOrder(params: {
  userId: string;
  items: CheckoutItem[];
  shipping: ShippingInfo;
  /** "online" reserves stock pending payment; "cod" confirms immediately */
  paymentMethod?: "online" | "cod";
  /** amount charged at the gateway (test mode: constant Rs. 10) — order total stays real */
  gatewayAmountNpr?: number;
  /** gateway provider for online payments (payment row's provider column) */
  provider?: "esewa" | "khalti";
}): Promise<CreateOrderResult> {
  const { userId, items, shipping, paymentMethod = "online" } = params;

  // merge duplicate product ids, clamp quantity
  const merged = new Map<string, number>();
  for (const item of items) {
    merged.set(item.productId, Math.min((merged.get(item.productId) ?? 0) + item.quantity, 10));
  }
  const productIds = [...merged.keys()];
  if (!productIds.length) return { ok: false, error: "Cart is empty" };

  if (paymentMethod === "online") {
    await releaseExpiredOrders();
  }

  return db.transaction(async (tx): Promise<CreateOrderResult> => {
    const rows = await tx
      .select()
      .from(product)
      .where(and(inArray(product.id, productIds), eq(product.status, "active")))
      .for("update");

    // missing products are rejected outright
    if (rows.length !== productIds.length) {
      return { ok: false, error: "Some items in your cart are no longer available" };
    }

    const lines = rows.map((p) => {
      const quantity = merged.get(p.id)!;
      if (p.stock < quantity) {
        throw new CheckoutError(`Only ${p.stock} left in stock for ${p.name}`);
      }
      return { product: p, quantity, lineTotal: p.price * quantity };
    });

    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const deliveryCharge = deliveryChargeFor(subtotal);
    const total = subtotal + deliveryCharge;

    // reserve stock
    for (const line of lines) {
      const updated = await tx
        .update(product)
        .set({ stock: sql`${product.stock} - ${line.quantity}`, updatedAt: new Date() })
        .where(and(eq(product.id, line.product.id), sql`${product.stock} >= ${line.quantity}`))
        .returning({ id: product.id });
      if (!updated[0]) {
        throw new CheckoutError(`Insufficient stock for ${line.product.name}`);
      }
    }

    // first image per product for the order snapshot
    const imageRows = await tx
      .select({ productId: productImage.productId, url: productImage.url, position: productImage.position })
      .from(productImage)
      .where(inArray(productImage.productId, productIds));
    const imageFor = (productId: string) =>
      imageRows
        .filter((i) => i.productId === productId)
        .sort((a, b) => a.position - b.position)[0]?.url ?? null;

    const orderNumber = generateOrderNumber();
    const expiresAt = paymentMethod === "online" ? new Date(Date.now() + ORDER_EXPIRY_MINUTES * 60 * 1000) : null;

    const [created] = await tx
      .insert(order)
      .values({
        orderNumber,
        userId,
        status: paymentMethod === "cod" ? "processing" : "pending_payment",
        customerName: shipping.customerName,
        email: shipping.email,
        phone: shipping.phone,
        province: shipping.province,
        city: shipping.city,
        address: shipping.address,
        notes: shipping.notes || null,
        subtotal,
        deliveryCharge,
        total,
        expiresAt,
      })
      .returning();

    await tx.insert(orderItem).values(
      lines.map((l) => ({
        orderId: created.id,
        productId: l.product.id,
        productName: l.product.name,
        sku: l.product.sku,
        unitPrice: l.product.price,
        quantity: l.quantity,
        imageUrl: imageFor(l.product.id),
      })),
    );

    if (paymentMethod === "online") {
      await tx.insert(payment).values({
        orderId: created.id,
        transactionUuid: orderNumber, // unique per order, provider-agnostic
        provider: params.provider ?? "esewa",
        amount: params.gatewayAmountNpr ?? total,
        status: "initiated",
      });
      return {
        ok: true,
        orderNumber,
        transactionUuid: orderNumber,
        subtotal,
        deliveryCharge,
        total,
        cod: false,
      };
    }

    return {
      ok: true,
      orderNumber,
      subtotal,
      deliveryCharge,
      total,
      cod: true,
    };
  }).catch((err) => {
    if (err instanceof CheckoutError) return { ok: false, error: err.message };
    throw err;
  });
}

export class CheckoutError extends Error {}
