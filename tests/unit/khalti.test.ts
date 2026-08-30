import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Khalti helper unit tests with a mocked HTTP layer. Only `Completed`
 * (verified via lookup) counts as success — per Khalti's docs.
 */
vi.mock("server-only", () => ({ default: {} }));

const KEY = "live_secret_test_key";
process.env.KHALTI_SECRET_KEY = KEY;
process.env.KHALTI_BASE_URL = "https://dev.khalti.com";

import { initiateKhaltiPayment, isKhaltiCompleted, lookupKhaltiPayment } from "@/lib/khalti";

afterEach(() => vi.unstubAllGlobals());

describe("initiateKhaltiPayment", () => {
  it("converts NPR to paisa and posts the required payload", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.amount).toBe(11_000_000); // Rs. 110000 → paisa
      expect(body.purchase_order_id).toBe("SS-2025-AB12CD34");
      expect(body.return_url).toContain("/payment/khalti/verify");
      return new Response(JSON.stringify({ pidx: "PIDX1", payment_url: "https://test-pay.khalti.com/?pidx=PIDX1" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await initiateKhaltiPayment({
      amountNpr: 110000,
      purchaseOrderId: "SS-2025-AB12CD34",
      purchaseOrderName: "SS Tech order",
      returnUrl: "http://localhost:3000/payment/khalti/verify",
      websiteUrl: "http://localhost:3000",
    });
    expect(res.pidx).toBe("PIDX1");
    expect(res.paymentUrl).toContain("test-pay.khalti.com");
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ Authorization: `Key ${KEY}` });
  });

  it("surfaces provider errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: "Invalid token." }), { status: 401 })));
    await expect(
      initiateKhaltiPayment({
        amountNpr: 1000,
        purchaseOrderId: "X",
        purchaseOrderName: "X",
        returnUrl: "http://x/",
        websiteUrl: "http://x/",
      }),
    ).rejects.toThrow(/invalid token/i);
  });

  it("enforces the Rs. 10 minimum before calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      initiateKhaltiPayment({
        amountNpr: 5,
        purchaseOrderId: "X",
        purchaseOrderName: "X",
        returnUrl: "http://x/",
        websiteUrl: "http://x/",
      }),
    ).rejects.toThrow(/minimum/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("lookupKhaltiPayment", () => {
  it("maps the lookup response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ pidx: "P1", status: "Completed", total_amount: 5050000, transaction_id: "TXN1" }),
          { status: 200 },
        ),
      ),
    );
    const res = await lookupKhaltiPayment("P1");
    expect(res.status).toBe("Completed");
    expect(res.totalAmountPaisa).toBe(5050000);
    expect(res.transactionId).toBe("TXN1");
  });
});

describe("isKhaltiCompleted", () => {
  it("treats only Completed as success", () => {
    expect(isKhaltiCompleted("Completed")).toBe(true);
    for (const s of ["Pending", "Initiated", "Expired", "User canceled", "Refunded", "Partially refunded"] as const) {
      expect(isKhaltiCompleted(s)).toBe(false);
    }
  });
});
