import crypto from "node:crypto";

/**
 * eSewa ePay v2 helpers. UAT test credentials are public knowledge and are
 * shown to users in the checkout test panel; the merchant secret key stays
 * server-side only.
 */

export interface EsewaFormFields {
  [key: string]: string;
  amount: string;
  tax_amount: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  product_service_charge: string;
  product_delivery_charge: string;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
}

const SIGNED_FIELDS = "total_amount,transaction_uuid,product_code";

export function esewaConfig() {
  return {
    productCode: process.env.ESEWA_PRODUCT_CODE || "EPAYTEST",
    secretKey: process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q",
    paymentUrl:
      process.env.ESEWA_PAYMENT_URL ||
      "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    statusUrl:
      process.env.ESEWA_STATUS_URL ||
      "https://rc-epay.esewa.com.np/api/epay/transaction/status/",
  };
}

export function esewaSignature(message: string, secretKey = esewaConfig().secretKey) {
  return crypto.createHmac("sha256", secretKey).update(message).digest("base64");
}

export function signRequestFields(fields: {
  total_amount: number;
  transaction_uuid: string;
}) {
  const message = `total_amount=${fields.total_amount},transaction_uuid=${fields.transaction_uuid},product_code=${esewaConfig().productCode}`;
  return esewaSignature(message);
}

export function buildEsewaFormFields(params: {
  subtotal: number;
  deliveryCharge: number;
  transactionUuid: string;
  baseUrl: string;
}): EsewaFormFields {
  const cfg = esewaConfig();
  const totalAmount = params.subtotal + params.deliveryCharge;
  return {
    amount: String(params.subtotal),
    tax_amount: "0",
    total_amount: String(totalAmount),
    transaction_uuid: params.transactionUuid,
    product_code: cfg.productCode,
    product_service_charge: "0",
    product_delivery_charge: String(params.deliveryCharge),
    success_url: `${params.baseUrl}/api/payments/esewa/success`,
    failure_url: `${params.baseUrl}/api/payments/esewa/failure`,
    signed_field_names: SIGNED_FIELDS,
    signature: signRequestFields({
      total_amount: totalAmount,
      transaction_uuid: params.transactionUuid,
    }),
  };
}

export interface EsewaCallbackResponse {
  [key: string]: string | number;
  status: string;
  signature: string;
  transaction_code: string;
  total_amount: number | string;
  transaction_uuid: string;
  product_code: string;
  signed_field_names: string;
}

export function decodeCallback(raw: string): EsewaCallbackResponse {
  const json = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  return json as EsewaCallbackResponse;
}

/** Rebuilds the HMAC over exactly the fields eSewa signed, in order. */
export function verifyCallbackSignature(res: EsewaCallbackResponse, secretKey = esewaConfig().secretKey) {
  const names = res.signed_field_names?.split(",") ?? [];
  const message = names.map((n) => `${n}=${res[n] ?? ""}`).join(",");
  const expected = esewaSignature(message, secretKey);
  const a = Buffer.from(expected);
  const b = Buffer.from(res.signature ?? "");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function checkEsewaTransactionStatus(params: {
  totalAmount: number;
  transactionUuid: string;
}) {
  const cfg = esewaConfig();
  const url = `${cfg.statusUrl}?product_code=${encodeURIComponent(cfg.productCode)}&total_amount=${encodeURIComponent(String(params.totalAmount))}&transaction_uuid=${encodeURIComponent(params.transactionUuid)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`eSewa status check failed: HTTP ${res.status}`);
  return (await res.json()) as { status?: string };
}
