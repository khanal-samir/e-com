import { describe, expect, it, vi } from "vitest";

/**
 * eSewa status recheck (admin payments page): mock only the eSewa HTTP call.
 */
vi.mock("@/lib/session", () => ({
  getSession: vi.fn(async () => ({ user: { id: "admin", role: "admin" } })),
  isAdmin: (s: { user?: { role?: string } } | null) => s?.user?.role === "admin",
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
}));

import { recheckPaymentStatus } from "@/lib/payments";
import { createTestBrand, createTestProduct, createTestUser } from "../fixtures/database";
import { createPendingOrder } from "@/lib/checkout";

const shipping = { customerName: "T U", email: "t@e.com", phone: "9812345678", province: "Bagmati", city: "Kathmandu", address: "Test Ward 1" };

describe("recheckPaymentStatus", () => {
  it("confirms a payment when eSewa reports COMPLETE", async () => {
    const brandId = (await createTestBrand("rc-ok")).id;
    const p = await createTestProduct(brandId, { price: 50000, stock: 3 });
    const user = await createTestUser();
    const res = await createPendingOrder({ userId: user.id, items: [{ productId: p.id, quantity: 1 }], shipping });
    if (!res.ok) throw new Error(res.error);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ status: "COMPLETE" }) })),
    );

    const { payment } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const { db } = await import("@/db");
    const [pay] = await db.select().from(payment).where(eq(payment.transactionUuid, res.transactionUuid!));

    const result = await recheckPaymentStatus(pay.id);
    expect(result.ok).toBe(true);
    expect(result.status).toBe("complete");

    const [updated] = await db.select().from(payment).where(eq(payment.id, pay.id));
    expect(updated.status).toBe("complete");
    vi.unstubAllGlobals();
  });

  it("rechecks Khalti payments via the lookup API", async () => {
    const brandId = (await createTestBrand("rc-khalti")).id;
    const p = await createTestProduct(brandId, { price: 50000, stock: 3 });
    const user = await createTestUser();
    const res = await createPendingOrder({ userId: user.id, items: [{ productId: p.id, quantity: 1 }], shipping });
    if (!res.ok) throw new Error(res.error);

    const { payment } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const { db } = await import("@/db");
    await db
      .update(payment)
      .set({ provider: "khalti", pidx: "pidx_recheck_test" })
      .where(eq(payment.transactionUuid, res.transactionUuid!));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ pidx: "pidx_recheck_test", status: "Completed", total_amount: res.total! * 100, transaction_id: "KTXN1" }) })),
    );

    const [pay] = await db.select().from(payment).where(eq(payment.transactionUuid, res.transactionUuid!));
    const result = await recheckPaymentStatus(pay.id);
    expect(result.ok).toBe(true);
    expect(result.status).toBe("complete");

    const [updated] = await db.select().from(payment).where(eq(payment.id, pay.id));
    expect(updated.status).toBe("complete");
    expect(updated.transactionCode).toBe("KTXN1");
    vi.unstubAllGlobals();
  });

  it("marks NOT_FOUND payments accordingly", async () => {
    const brandId = (await createTestBrand("rc-nf")).id;
    const p = await createTestProduct(brandId, { price: 50000, stock: 3 });
    const user = await createTestUser();
    const res = await createPendingOrder({ userId: user.id, items: [{ productId: p.id, quantity: 1 }], shipping });
    if (!res.ok) throw new Error(res.error);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ status: "NOT_FOUND" }) })),
    );

    const { payment } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const { db } = await import("@/db");
    const [pay] = await db.select().from(payment).where(eq(payment.transactionUuid, res.transactionUuid!));

    const result = await recheckPaymentStatus(pay.id);
    expect(result.ok).toBe(true);
    expect(result.status).toBe("NOT_FOUND");

    const [updated] = await db.select().from(payment).where(eq(payment.id, pay.id));
    expect(updated.status).toBe("not_found");
    vi.unstubAllGlobals();
  });
});
