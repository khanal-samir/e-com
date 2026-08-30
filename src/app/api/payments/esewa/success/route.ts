import { NextResponse, type NextRequest } from "next/server";
import { verifyEsewaSuccess } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * eSewa success callback. eSewa POSTs form-encoded `data` (base64 JSON).
 * Idempotent: user refresh / double-POST cannot double-apply the payment.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const data = formData.get("data");
  if (typeof data !== "string" || !data) {
    return NextResponse.redirect(new URL("/payment/failure", req.url));
  }

  const result = await verifyEsewaSuccess(data);
  if (result.ok) {
    return NextResponse.redirect(new URL(`/payment/success?order=${encodeURIComponent(result.orderNumber)}`, req.url));
  }

  console.error("eSewa success verification failed:", result.error);
  return NextResponse.redirect(new URL("/payment/failure", req.url));
}

/** eSewa may also redirect via GET in some configurations. */
export async function GET(req: NextRequest) {
  const data = req.nextUrl.searchParams.get("data");
  if (!data) return NextResponse.redirect(new URL("/payment/failure", req.url));
  const result = await verifyEsewaSuccess(data);
  if (result.ok) {
    return NextResponse.redirect(new URL(`/payment/success?order=${encodeURIComponent(result.orderNumber)}`, req.url));
  }
  return NextResponse.redirect(new URL("/payment/failure", req.url));
}
