import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { order, payment, product } from "@/db/schema";
import { createTestBrand, createTestProduct, createTestUser } from "../fixtures/database";
import { createPendingOrder } from "@/lib/checkout";
import { markPaymentFailed, markPaymentComplete, releaseExpiredOrders } from "@/lib/orders";

const shipping = { customerName: "T U", email: "t@e.com", phone: "9812345678", province: "Bagmati", city: "Kathmandu", address: "Test Ward 1" };

async function placeOrder(brandId: string, overrides = {}) {
  const p = await createTestProduct(brandId, { price: 50000, stock: 3, ...overrides });
  const user = await createTestUser();
  const res = await createPendingOrder({ userId: user.id, items: [{ productId: p.id, quantity: 1 }], shipping });
  if (!res.ok) throw new Error(res.error);
  return { product: p, user, ...res };
}

async function stockOf(productId: string) {
  const [row] = await db.select({ stock: product.stock }).from(product).where(eq(product.id, productId));
  return row.stock;
}

describe("stock reservation lifecycle", () => {
  it("failure releases reserved stock exactly once", async () => {
    const brandId = (await createTestBrand("inv-fail")).id;
    const { product: p, orderNumber } = await placeOrder(brandId);
    expect(await stockOf(p.id)).toBe(2);

    expect(await markPaymentFailed(orderNumber)).toBe(true);
    expect(await stockOf(p.id)).toBe(3);

    // second release attempt is a no-op
    expect(await markPaymentFailed(orderNumber)).toBe(true); // updates payment row state but stock already released
    expect(await stockOf(p.id)).toBe(3);
  });

  it("never releases stock for a completed payment", async () => {
    const brandId = (await createTestBrand("inv-paid")).id;
    const { product: p, orderNumber, total } = await placeOrder(brandId);

    const paid = await markPaymentComplete({ transactionUuid: orderNumber, transactionCode: "TEST123", amount: total!, rawResponse: "" });
    expect(paid.ok).toBe(true);
    expect(await stockOf(p.id)).toBe(2);

    await markPaymentFailed(orderNumber);
    expect(await stockOf(p.id)).toBe(2); // untouched
  });

  it("expired unpaid orders are cancelled and restocked once", async () => {
    const brandId = (await createTestBrand("inv-exp")).id;
    const { product: p, orderNumber } = await placeOrder(brandId);
    expect(await stockOf(p.id)).toBe(2);

    // force expiry
    const rows = await db.select().from(order).where(eq(order.orderNumber, orderNumber));
    await db.update(order).set({ expiresAt: new Date(Date.now() - 60_000) }).where(eq(order.id, rows[0].id));

    expect(await releaseExpiredOrders()).toBeGreaterThanOrEqual(1);
    expect(await stockOf(p.id)).toBe(3);

    const [pay] = await db.select().from(payment).where(eq(payment.transactionUuid, orderNumber));
    expect(pay.status).toBe("cancelled");

    // idempotent: re-running doesn't restock twice
    expect(await releaseExpiredOrders()).toBe(0);
    expect(await stockOf(p.id)).toBe(3);
  });
});

describe("markPaymentComplete", () => {
  it("is idempotent across duplicate callbacks", async () => {
    const brandId = (await createTestBrand("pay-idem")).id;
    const { orderNumber, total } = await placeOrder(brandId);

    const first = await markPaymentComplete({ transactionUuid: orderNumber, transactionCode: "CODE1", amount: total!, rawResponse: "raw" });
    expect(first.ok).toBe(true);
    expect(first.alreadyComplete).toBe(false);

    const second = await markPaymentComplete({ transactionUuid: orderNumber, transactionCode: "CODE1", amount: total!, rawResponse: "raw" });
    expect(second.ok).toBe(true);
    expect(second.alreadyComplete).toBe(true);

    const [o] = await db.select().from(order).where(eq(order.orderNumber, orderNumber));
    expect(o.status).toBe("paid");
  });

  it("rejects an amount mismatch", async () => {
    const brandId = (await createTestBrand("pay-amt")).id;
    const { orderNumber, total } = await placeOrder(brandId);
    const res = await markPaymentComplete({ transactionUuid: orderNumber, transactionCode: "X", amount: total! + 1, rawResponse: "" });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("amount_mismatch");

    const [o] = await db.select().from(order).where(eq(order.orderNumber, orderNumber));
    expect(o.status).toBe("pending_payment");
  });

  it("rejects unknown transaction uuids", async () => {
    const res = await markPaymentComplete({ transactionUuid: "SS-0000-UNKNOWN1", transactionCode: "X", amount: 100, rawResponse: "" });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("payment_not_found");
  });
});
