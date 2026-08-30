import "server-only";

/**
 * Khalti ePayment v2 (KPG-2) server-side helpers.
 * Sandbox: https://dev.khalti.com — test wallets 9800000000-05, MPIN 1111, OTP 987654.
 * Only the secret key is used (server-to-server); no client SDK, no signatures.
 */

const khaltiConfig = () => ({
  baseUrl: process.env.KHALTI_BASE_URL || "https://dev.khalti.com",
  secretKey: process.env.KHALTI_SECRET_KEY || "",
});

export interface KhaltiInitiateResult {
  pidx: string;
  paymentUrl: string;
}

/** Creates a Khalti payment for the given amount (NPR) — returns pidx + hosted payment URL. */
export async function initiateKhaltiPayment(params: {
  amountNpr: number;
  purchaseOrderId: string;
  purchaseOrderName: string;
  returnUrl: string;
  websiteUrl: string;
  customer?: { name?: string; email?: string; phone?: string };
}): Promise<KhaltiInitiateResult> {
  const { baseUrl, secretKey } = khaltiConfig();
  if (!secretKey) throw new KhaltiError("Khalti is not configured (missing KHALTI_SECRET_KEY)");

  const amountPaisa = params.amountNpr * 100;
  if (amountPaisa < 1000) throw new KhaltiError("Khalti requires a minimum payment of Rs. 10");

  const res = await fetch(`${baseUrl}/api/v2/epayment/initiate/`, {
    method: "POST",
    headers: {
      Authorization: `Key ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      return_url: params.returnUrl,
      website_url: params.websiteUrl,
      amount: amountPaisa,
      purchase_order_id: params.purchaseOrderId,
      purchase_order_name: params.purchaseOrderName,
      ...(params.customer ? { customer_info: params.customer } : {}),
    }),
    cache: "no-store",
  });

  const body = (await res.json().catch(() => null)) as
    | { pidx?: string; payment_url?: string; detail?: string; error_key?: string }
    | null;

  if (!res.ok || !body?.pidx || !body?.payment_url) {
    throw new KhaltiError(body?.detail ?? "Khalti payment initiation failed");
  }
  return { pidx: body.pidx, paymentUrl: body.payment_url };
}

export type KhaltiLookupStatus =
  | "Completed"
  | "Pending"
  | "Initiated"
  | "Refunded"
  | "Partially refunded"
  | "Expired"
  | "User canceled";

export interface KhaltiLookupResult {
  pidx: string;
  status: KhaltiLookupStatus;
  totalAmountPaisa: number;
  transactionId: string | null;
}

/** Verifies a payment by pidx. Only `Completed` is a success (per Khalti docs). */
export async function lookupKhaltiPayment(pidx: string): Promise<KhaltiLookupResult> {
  const { baseUrl, secretKey } = khaltiConfig();
  if (!secretKey) throw new KhaltiError("Khalti is not configured (missing KHALTI_SECRET_KEY)");

  const res = await fetch(`${baseUrl}/api/v2/epayment/lookup/`, {
    method: "POST",
    headers: {
      Authorization: `Key ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pidx }),
    cache: "no-store",
  });

  const body = (await res.json().catch(() => null)) as
    | { pidx?: string; status?: string; total_amount?: number; transaction_id?: string | null; detail?: string }
    | null;

  if (!res.ok || !body?.status) {
    throw new KhaltiError(body?.detail ?? "Khalti lookup failed");
  }
  return {
    pidx: body.pidx ?? pidx,
    status: body.status as KhaltiLookupStatus,
    totalAmountPaisa: Number(body.total_amount ?? 0),
    transactionId: body.transaction_id ?? null,
  };
}

export function isKhaltiCompleted(status: KhaltiLookupStatus) {
  return status === "Completed";
}

export class KhaltiError extends Error {}
