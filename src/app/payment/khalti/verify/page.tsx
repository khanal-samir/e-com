import { redirect } from "next/navigation";
import { verifyKhaltiSuccess } from "@/lib/payments";

export const dynamic = "force-dynamic";

export const metadata = { title: "Verifying payment" };

/**
 * Khalti return page. Khalti GET-redirects here with query params after the
 * user pays (or cancels). The lookup API is the only source of truth.
 */
export default async function KhaltiVerifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pidx = typeof sp.pidx === "string" ? sp.pidx : "";
  const purchaseOrderId = typeof sp.purchase_order_id === "string" ? sp.purchase_order_id : "";

  // some clients ping the return URL without params — send them somewhere neutral, not the failure page
  if (!pidx) redirect("/account/orders");

  const result = await verifyKhaltiSuccess(pidx);
  if (result.ok) {
    const orderNumber = result.orderNumber || purchaseOrderId;
    redirect(`/payment/success?order=${encodeURIComponent(orderNumber)}`);
  }

  console.error("Khalti verification failed:", result.error);
  redirect("/payment/failure");
}
