import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { order, payment, product } from "@/db/schema";
import { createTestBrand, createTestProduct, createTestUser } from "../fixtures/database";
import { createPendingOrder } from "@/lib/checkout";
import { verifyKhaltiSuccess } from "@/lib/payments";

const shipping = { customerName: "T U", email: "t@e.com", phone: "9812345678", province: "Bagmati", city: "Kathmandu", address: "Test Ward 1" };

async function placeKhaltiOrder(brandId: string) {
  const p = await createTestProduct(brandId, { price: 50000, stock: 3 });
  const user = await createTestUser();
  const res = await createPendingOrder({
    userId: user.id,
    items: [{ productId: p.id, quantity: 1 }],
    shipping,
    paymentMethod: "online",
  });
  if (!res.ok) throw new Error(res.error);
  // simulate the checkout action storing pidx after a successful initiate
  const pidx = `pidx_${res.orderNumber}`;
  await db.update(payment).set({ pidx }).where(eq(payment.transactionUuid, res.transactionUuid!));
  return { product: p, pidx, transactionUuid: res.transactionUuid!, orderNumber: res.orderNumber, total: res.total };
}

function mockLookup(status: string, totalPaisa: number, txnId = "TXN1") {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ pidx: "x", status, total_amount: totalPaisa, transaction_id: txnId }), { status: status === "Completed" ? 200 : 200 }),
    ),
  );
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ status: "Completed", total_amount: 0 }), { status: 200 })),
  );
});

afterEach(() => vi.unstubAllGlobals());

async function stockOf(productId: string) {
  const [row] = await db.select({ stock: product.stock }).from(product).where(eq(product.id, productId));
  return row.stock;
}

describe("verifyKhaltiSuccess", () => {
  it("marks payment + order paid on Completed lookup (idempotent on replay)", async () => {
    const brandId = (await createTestBrand("kh-ok")).id;
    const { product: p, pidx, transactionUuid } = await placeKhaltiOrder(brandId);
    expect(await stockOf(p.id)).toBe(2);

    mockLookup("Completed", 50500 * 100);
    const first = await verifyKhaltiSuccess(pidx);
    if (!first.ok) throw new Error(first.error);
    expect(first.alreadyComplete).toBe(false);

    const [pay] = await db.select().from(payment).where(eq(payment.transactionUuid, transactionUuid));
    expect(pay.status).toBe("complete");
    expect(pay.transactionCode).toBe("TXN1");

    const [o] = await db.select().from(order).where(eq(order.orderNumber, transactionUuid));
    expect(o.status).toBe("paid");

    // replay of the return URL must not double-apply
    const second = await verifyKhaltiSuccess(pidx);
    if (!second.ok) throw new Error(second.error);
    expect(second.alreadyComplete).toBe(true);
  });

  it("rejects an amount mismatch", async () => {
    const brandId = (await createTestBrand("kh-amt")).id;
    const { product: p, pidx } = await placeKhaltiOrder(brandId);

    mockLookup("Completed", 999 * 100);
    const result = await verifyKhaltiSuccess(pidx);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.error).toMatch(/mismatch/i);

    expect(await stockOf(p.id)).toBe(2); // not released — admin can still reconcile
  });

  it("cancels the order and releases stock on User canceled / Expired", async () => {
    const brandId = (await createTestBrand("kh-cancel")).id;
    const { product: p, pidx, transactionUuid } = await placeKhaltiOrder(brandId);

    mockLookup("User canceled", 50500 * 100, "");
    const result = await verifyKhaltiSuccess(pidx);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");

    const [o] = await db.select().from(order).where(eq(order.orderNumber, transactionUuid));
    expect(o.status).toBe("cancelled");
    expect(await stockOf(p.id)).toBe(3);

    const [pay] = await db.select().from(payment).where(eq(payment.transactionUuid, transactionUuid));
    expect(pay.status).toBe("failed");
  });

  it("rejects an unknown pidx", async () => {
    const result = await verifyKhaltiSuccess("pidx_does_not_exist");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.error).toMatch(/unknown transaction/i);
  });
});

describe("cash on delivery orders", () => {
  it("confirms immediately with no payment row and no expiry", async () => {
    const brandId = (await createTestBrand("kh-cod")).id;
    const p = await createTestProduct(brandId, { price: 50000, stock: 3 });
    const user = await createTestUser();
    const res = await createPendingOrder({
      userId: user.id,
      items: [{ productId: p.id, quantity: 1 }],
      shipping,
      paymentMethod: "cod",
    });
    if (!res.ok) throw new Error(res.error);

    expect(res.cod).toBe(true);
    expect(res.transactionUuid).toBeUndefined();

    const [o] = await db.select().from(order).where(eq(order.orderNumber, res.orderNumber));
    expect(o.status).toBe("processing");
    expect(o.expiresAt).toBeNull();

    const pays = await db.select().from(payment).where(eq(payment.orderId, o.id));
    expect(pays).toHaveLength(0);

    // stock stays decremented (delivered against cash on the doorstep)
    expect(await stockOf(p.id)).toBe(2);
  });
});
