import { NextResponse, type NextRequest } from "next/server";
import { markPaymentFailed } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** eSewa failure callback: release reserved stock (once) and inform the user. */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const data = formData.get("data");
  if (typeof data === "string" && data) {
    try {
      const parsed = JSON.parse(Buffer.from(data, "base64").toString("utf8")) as { transaction_uuid?: string };
      if (parsed.transaction_uuid) {
        await markPaymentFailed(parsed.transaction_uuid, "failed");
      }
    } catch {
      // malformed callback — nothing safe to release
    }
  }
  return NextResponse.redirect(new URL("/payment/failure", req.url));
}

export async function GET(req: NextRequest) {
  const uuid = req.nextUrl.searchParams.get("transaction_uuid");
  if (uuid) await markPaymentFailed(uuid, "failed");
  return NextResponse.redirect(new URL("/payment/failure", req.url));
}
