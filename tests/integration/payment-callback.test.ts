import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { order, payment } from "@/db/schema";
import { createTestBrand, createTestProduct, createTestUser } from "../fixtures/database";
import { createPendingOrder } from "@/lib/checkout";
import { verifyEsewaSuccess } from "@/lib/payments";
import { esewaSignature } from "@/lib/esewa";

const shipping = { customerName: "T U", email: "t@e.com", phone: "9812345678", province: "Bagmati", city: "Kathmandu", address: "Test Ward 1" };

/** Builds a callback exactly like eSewa's: sign all signed_field_names values. */
function encodeCallback(fields: Record<string, unknown>, secret = "8gBm/:&EnhH.1/q") {
  const names = String(fields.signed_field_names).split(",");
  const payload = { ...fields, signature: "" };
  payload.signature = esewaSignature(
    names.map((n) => `${n}=${(payload as Record<string, unknown>)[n]}`).join(","),
    secret,
  );
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ status: "COMPLETE" }) })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("verifyEsewaSuccess", () => {
  it("completes a valid callback and is idempotent on replay", async () => {
    const brandId = (await createTestBrand("cb-ok")).id;
    const p = await createTestProduct(brandId, { price: 50000, stock: 3 });
    const user = await createTestUser();
    const res = await createPendingOrder({ userId: user.id, items: [{ productId: p.id, quantity: 1 }], shipping });
    if (!res.ok) throw new Error(res.error);

    const encoded = encodeCallback({
      status: "COMPLETE",
      transaction_code: "00AB1C",
      total_amount: res.total,
      transaction_uuid: res.transactionUuid,
      product_code: "EPAYTEST",
      signed_field_names: "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
    });

    const first = await verifyEsewaSuccess(encoded);
    if (!first.ok) throw new Error(first.error);
    expect(first.alreadyComplete).toBe(false);

    const [pay] = await db.select().from(payment).where(eq(payment.transactionUuid, res.transactionUuid!));
    expect(pay.status).toBe("complete");
    expect(pay.transactionCode).toBe("00AB1C");
    expect(pay.verifiedAt).not.toBeNull();

    const [o] = await db.select().from(order).where(eq(order.id, pay.orderId));
    expect(o.status).toBe("paid");

    // replay (refresh/double POST)
    const second = await verifyEsewaSuccess(encoded);
    if (!second.ok) throw new Error(second.error);
    expect(second.alreadyComplete).toBe(true);
  });

  it("rejects a tampered amount (signature mismatch)", async () => {
    const brandId = (await createTestBrand("cb-tamper")).id;
    const p = await createTestProduct(brandId, { price: 50000, stock: 3 });
    const user = await createTestUser();
    const res = await createPendingOrder({ userId: user.id, items: [{ productId: p.id, quantity: 1 }], shipping });
    if (!res.ok) throw new Error(res.error);

    const signed = Buffer.from(
      JSON.stringify({
        status: "COMPLETE",
        transaction_code: "00AB1C",
        total_amount: res.total,
        transaction_uuid: res.transactionUuid,
        product_code: "EPAYTEST",
        signed_field_names: "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
        signature: esewaSignature(
          `transaction_code=00AB1C,status=COMPLETE,total_amount=${res.total},transaction_uuid=${res.transactionUuid},product_code=EPAYTEST,signed_field_names=transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names`,
        ),
      }),
    ).toString("base64");

    // attacker rewrites the amount but keeps the old signature
    const decoded = JSON.parse(Buffer.from(signed, "base64").toString()) as Record<string, unknown>;
    decoded.total_amount = 1;
    const tampered = Buffer.from(JSON.stringify(decoded)).toString("base64");

    const result = await verifyEsewaSuccess(tampered);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.error).toMatch(/signature/i);

    const [o] = await db.select().from(order).where(eq(order.orderNumber, res.orderNumber!));
    expect(o.status).toBe("pending_payment");
  });

  it("cancels the order and releases stock when eSewa reports non-COMPLETE", async () => {
    const brandId = (await createTestBrand("cb-pending")).id;
    const p = await createTestProduct(brandId, { price: 50000, stock: 3 });
    const user = await createTestUser();
    const res = await createPendingOrder({ userId: user.id, items: [{ productId: p.id, quantity: 1 }], shipping });
    if (!res.ok) throw new Error(res.error);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ status: "PENDING" }) })),
    );

    const encoded = encodeCallback({
      status: "COMPLETE",
      transaction_code: "00AB1C",
      total_amount: res.total,
      transaction_uuid: res.transactionUuid,
      product_code: "EPAYTEST",
      signed_field_names: "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
    });

    const result = await verifyEsewaSuccess(encoded);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");

    const [o] = await db.select().from(order).where(eq(order.orderNumber, res.orderNumber!));
    expect(o.status).toBe("cancelled");

    const [p2] = await db.select().from(payment).where(eq(payment.transactionUuid, res.transactionUuid!));
    expect(p2.status).toBe("failed");
  });

  it("rejects a foreign product code", async () => {
    const result = await verifyEsewaSuccess(
      encodeCallback({
        status: "COMPLETE",
        transaction_code: "X",
        total_amount: 100,
        transaction_uuid: "SS-0000-NOPE0001",
        product_code: "NOT_EPAYTEST",
        signed_field_names: "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.error).toMatch(/product code/i);
  });
});
