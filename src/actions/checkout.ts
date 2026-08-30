"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { payment } from "@/db/schema";
import { buildEsewaFormFields } from "@/lib/esewa";
import { initiateKhaltiPayment } from "@/lib/khalti";
import { createPendingOrder } from "@/lib/checkout";
import { TEST_PAYMENT_AMOUNT_NPR } from "@/lib/pricing";
import { getSession } from "@/lib/session";
import { checkoutSchema } from "@/lib/validators";

export interface CheckoutActionState {
  ok?: boolean;
  error?: string;
  /** eSewa: signed form payload the browser posts directly */
  esewa?: { url: string; fields: Record<string, string> };
  /** Khalti: redirect the browser to this hosted payment URL */
  khaltiPaymentUrl?: string;
  /** COD: order confirmed, redirect to its detail page */
  orderNumber?: string;
}

export async function checkoutAction(
  _prev: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/checkout");

  let payload: unknown;
  try {
    payload = {
      items: JSON.parse(String(formData.get("items") ?? "[]")),
      shipping: {
        customerName: formData.get("customerName"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        province: formData.get("province"),
        city: formData.get("city"),
        address: formData.get("address"),
        notes: formData.get("notes"),
      },
      paymentMethod: formData.get("paymentMethod") ?? "esewa",
    };
  } catch {
    return { error: "Invalid request" };
  }

  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first ? `${first.path.join(".") || "Form"}: ${first.message}` : "Invalid form data" };
  }

  const { paymentMethod } = parsed.data;
  // sandbox wallets hold only a few rupees: in test mode the gateway is
  // always charged a constant Rs. 10 while the order keeps its real total
  const testMode = process.env.PAYMENT_TEST_MODE === "1";
  const gatewayAmount = testMode ? TEST_PAYMENT_AMOUNT_NPR : undefined;
  let result;
  try {
    result = await createPendingOrder({
      userId: session.user.id,
      items: parsed.data.items,
      shipping: parsed.data.shipping,
      paymentMethod: paymentMethod === "cod" ? "cod" : "online",
      provider: paymentMethod === "khalti" ? "khalti" : "esewa",
      gatewayAmountNpr: gatewayAmount,
    });
  } catch (err) {
    console.error(err);
    return { error: "Could not place order. Please try again." };
  }

  if (!result.ok) return { error: result.error ?? "Could not place order" };

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;

  // ---- Cash on Delivery: done immediately ----
  if (paymentMethod === "cod") {
    return { ok: true, orderNumber: result.orderNumber };
  }

  // ---- eSewa: signed browser form ----
  if (paymentMethod === "esewa") {
    const fields = buildEsewaFormFields({
      subtotal: gatewayAmount ?? result.subtotal,
      deliveryCharge: gatewayAmount ? 0 : result.deliveryCharge,
      transactionUuid: result.transactionUuid!,
      baseUrl,
    });
    return {
      ok: true,
      esewa: {
        url: process.env.ESEWA_PAYMENT_URL || "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
        fields,
      },
    };
  }

  // ---- Khalti: initiate server-side, redirect to hosted payment page ----
  try {
    const { pidx, paymentUrl } = await initiateKhaltiPayment({
      amountNpr: gatewayAmount ?? result.total,
      purchaseOrderId: result.orderNumber,
      purchaseOrderName: `SS Tech order ${result.orderNumber}`,
      returnUrl: `${baseUrl}/payment/khalti/verify`,
      websiteUrl: baseUrl,
      customer: {
        name: parsed.data.shipping.customerName,
        email: parsed.data.shipping.email,
        phone: parsed.data.shipping.phone,
      },
    });
    await db.update(payment).set({ pidx, updatedAt: new Date() }).where(eq(payment.transactionUuid, result.transactionUuid!));
    return { ok: true, khaltiPaymentUrl: paymentUrl };
  } catch (err) {
    console.error("Khalti initiate failed:", err);
    // cancel + release so the user can retry cleanly
    const { markPaymentFailed } = await import("@/lib/orders");
    await markPaymentFailed(result.transactionUuid!, "failed");
    return { error: "Could not start the Khalti payment. Please try again." };
  }
}
