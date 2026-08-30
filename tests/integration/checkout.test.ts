import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { product } from "@/db/schema";
import { createTestBrand, createTestProduct, createTestUser } from "../fixtures/database";
import { createPendingOrder } from "@/lib/checkout";

let brandId: string;

beforeAll(async () => {
  brandId = (await createTestBrand("checkout-brand")).id;
});

describe("createPendingOrder", () => {
  it("prices the order from the database, never from client data", async () => {
    const p = await createTestProduct(brandId, { price: 100000, stock: 5 });
    const user = await createTestUser();
    const shipping = { customerName: "Test User", email: user.email, phone: "9812345678", province: "Bagmati", city: "Kathmandu", address: "Test Ward 1" };

    const res = await createPendingOrder({
      userId: user.id,
      items: [{ productId: p.id, quantity: 2 }],
      shipping: { ...shipping, email: "attacker@evil.com" },
    });
    if (!res.ok) throw new Error(res.error);

    // subtotal = 2 × DB price (100000), delivery free above 1,00,000
    expect(res.subtotal).toBe(200000);
    expect(res.deliveryCharge).toBe(0);
    expect(res.total).toBe(200000);
    expect(res.orderNumber).toMatch(/^SS-\d{4}-[A-F0-9]{8}$/);
    expect(res.transactionUuid).toBe(res.orderNumber);
  });

  it("adds delivery charge below the threshold and decrements stock", async () => {
    const p = await createTestProduct(brandId, { price: 50000, stock: 5 });
    const user = await createTestUser();
    const res = await createPendingOrder({
      userId: user.id,
      items: [{ productId: p.id, quantity: 1 }],
      shipping: { customerName: "T U", email: "t@e.com", phone: "9812345678", province: "Bagmati", city: "Kathmandu", address: "Test Ward 1" },
    });
    if (!res.ok) throw new Error(res.error);
    expect(res.deliveryCharge).toBe(500);
    expect(res.total).toBe(50500);

    const after = await db.select({ stock: product.stock }).from(product).where(eq(product.id, p.id));
    expect(after[0].stock).toBe(4);
  });

  it("refuses to oversell", async () => {
    const p = await createTestProduct(brandId, { stock: 1 });
    const user = await createTestUser();
    const res = await createPendingOrder({
      userId: user.id,
      items: [{ productId: p.id, quantity: 2 }],
      shipping: { customerName: "T U", email: "t@e.com", phone: "9812345678", province: "Bagmati", city: "Kathmandu", address: "Test Ward 1" },
    });
    expect(res.ok).toBe(false);

    const after = await db.select({ stock: product.stock }).from(product).where(eq(product.id, p.id));
    expect(after[0].stock).toBe(1); // unchanged
  });

  it("rejects inactive/draft products", async () => {
    const p = await createTestProduct(brandId, { status: "draft" });
    const user = await createTestUser();
    const res = await createPendingOrder({
      userId: user.id,
      items: [{ productId: p.id, quantity: 1 }],
      shipping: { customerName: "T U", email: "t@e.com", phone: "9812345678", province: "Bagmati", city: "Kathmandu", address: "Test Ward 1" },
    });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected failure");
    expect(res.error).toMatch(/no longer available/i);
  });
});
