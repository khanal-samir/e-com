import { eq } from "drizzle-orm";
import { db } from "@/db";
import { order, payment } from "@/db/schema";
import { markPaymentComplete, markPaymentFailed } from "@/lib/orders";
import { isKhaltiCompleted, lookupKhaltiPayment } from "@/lib/khalti";
import { checkEsewaTransactionStatus, decodeCallback, esewaConfig, verifyCallbackSignature } from "@/lib/esewa";

export type VerifyResult =
  | { ok: true; alreadyComplete: boolean; orderNumber: string }
  | { ok: false; error: string };

/**
 * Khalti return-page verification. Khalti GET-redirects to our verify page
 * with pidx + purchase_order_id; the authoritative answer comes from the
 * lookup API. Anything other than `Completed` cancels the order and releases
 * stock immediately — no hanging "pending" states.
 */
export async function verifyKhaltiSuccess(pidx: string): Promise<VerifyResult> {
  if (!pidx) return { ok: false, error: "Missing payment identifier" };

  const rows = await db.select().from(payment).where(eq(payment.pidx, pidx)).limit(1);
  const pay = rows[0];
  if (!pay) return { ok: false, error: "Unknown transaction" };

  let lookup;
  try {
    lookup = await lookupKhaltiPayment(pidx);
  } catch (err) {
    console.error("Khalti lookup failed:", err);
    // keep the order alive for a manual admin recheck; stock still reserved
    return { ok: false, error: "Could not verify payment with Khalti. Try again or contact support." };
  }

  const [orderRow] = await db.select().from(order).where(eq(order.id, pay.orderId)).limit(1);

  if (!isKhaltiCompleted(lookup.status)) {
    if (orderRow && orderRow.status === "pending_payment") {
      await markPaymentFailed(pay.transactionUuid, "failed");
    }
    return { ok: false, error: `Payment not completed (Khalti status: ${lookup.status})` };
  }

  const amountNpr = Math.round(lookup.totalAmountPaisa / 100);
  const result = await markPaymentComplete({
    transactionUuid: pay.transactionUuid,
    transactionCode: lookup.transactionId ?? "",
    amount: amountNpr,
    rawResponse: JSON.stringify(lookup),
  });

  if (!result.ok) {
    if (result.reason === "amount_mismatch") return { ok: false, error: "Payment amount mismatch" };
    return { ok: false, error: "Unknown transaction" };
  }
  return { ok: true, alreadyComplete: result.alreadyComplete, orderNumber: pay.transactionUuid };
}

/**
 * Admin recheck, provider-aware. Strict policy for both providers:
 * non-success ⇒ payment failed + order cancelled + stock released.
 */
export async function recheckPaymentStatus(paymentId: string) {
  const rows = await db.select().from(payment).where(eq(payment.id, paymentId)).limit(1);
  const pay = rows[0];
  if (!pay) return { ok: false, error: "Payment not found" };
  if (pay.status === "complete") return { ok: true, status: "complete", message: "Payment already confirmed" };

  try {
    if (pay.provider === "khalti") {
      if (!pay.pidx) return { ok: false, error: "Payment has no Khalti pidx stored" };
      const lookup = await lookupKhaltiPayment(pay.pidx);
      if (isKhaltiCompleted(lookup.status)) {
        await markPaymentComplete({
          transactionUuid: pay.transactionUuid,
          transactionCode: lookup.transactionId ?? "",
          amount: Math.round(lookup.totalAmountPaisa / 100),
          rawResponse: JSON.stringify(lookup),
        });
        return { ok: true, status: "complete", message: "Khalti reports Completed — payment confirmed" };
      }
      if (["Expired", "User canceled"].includes(lookup.status)) {
        await markPaymentFailed(pay.transactionUuid, "failed");
      }
      return { ok: true, status: lookup.status, message: `Khalti status: ${lookup.status}` };
    }

    // eSewa
    const status = await checkEsewaTransactionStatus({
      totalAmount: pay.amount,
      transactionUuid: pay.transactionUuid,
    });
    const remote = status.status ?? "UNKNOWN";
    if (remote === "COMPLETE") {
      await markPaymentComplete({
        transactionUuid: pay.transactionUuid,
        transactionCode: "",
        amount: pay.amount,
        rawResponse: "",
      });
      return { ok: true, status: "complete", message: "eSewa reports COMPLETE — payment confirmed" };
    }
    if (["NOT_FOUND", "CANCELED"].includes(remote)) {
      await markPaymentFailed(pay.transactionUuid, remote === "CANCELED" ? "cancelled" : "not_found");
    } else {
      await db
        .update(payment)
        .set({ status: "pending", updatedAt: new Date() })
        .where(eq(payment.id, pay.id));
    }
    return { ok: true, status: remote, message: `eSewa status: ${remote}` };
  } catch (err) {
    console.error("Recheck failed:", err);
    return { ok: false, error: "Could not reach the payment provider's status endpoint" };
  }
}

/* ---------------- eSewa success callback (kept; strict on failure) ---------------- */

export async function verifyEsewaSuccess(base64Data: string): Promise<VerifyResult> {
  let res;
  try {
    res = decodeCallback(base64Data);
  } catch {
    return { ok: false, error: "Malformed payment response" };
  }

  if (!verifyCallbackSignature(res)) {
    return { ok: false, error: "Invalid payment signature" };
  }

  const cfg = esewaConfig();
  if (res.product_code !== cfg.productCode) {
    return { ok: false, error: "Unknown product code" };
  }

  const amount = Number(res.total_amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Invalid amount" };
  }

  let remoteStatus: string | undefined;
  try {
    const status = await checkEsewaTransactionStatus({
      totalAmount: amount,
      transactionUuid: res.transaction_uuid,
    });
    remoteStatus = status.status;
  } catch (err) {
    console.error("eSewa status check failed:", err);
    return { ok: false, error: "Could not confirm payment with eSewa." };
  }

  if (remoteStatus !== "COMPLETE") {
    // strict: cancel + release stock immediately instead of holding in review
    await markPaymentFailed(res.transaction_uuid, "failed");
    return { ok: false, error: `Payment not completed (eSewa status: ${remoteStatus ?? "unknown"})` };
  }

  const result = await markPaymentComplete({
    transactionUuid: res.transaction_uuid,
    transactionCode: res.transaction_code,
    amount,
    rawResponse: base64Data,
  });

  if (!result.ok) {
    if (result.reason === "amount_mismatch") return { ok: false, error: "Payment amount mismatch" };
    return { ok: false, error: "Unknown transaction" };
  }
  return { ok: true, alreadyComplete: result.alreadyComplete, orderNumber: res.transaction_uuid };
}
