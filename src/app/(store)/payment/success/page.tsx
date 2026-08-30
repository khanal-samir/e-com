import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClearCartOnMount } from "@/components/clear-cart-on-mount";
import { formatNpr } from "@/lib/utils";
import { requireUser } from "@/lib/session";
import { getUserOrder } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Payment successful" };

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireUser();
  const sp = await searchParams;
  const orderNumber = typeof sp.order === "string" ? sp.order : null;
  const order = orderNumber ? await getUserOrder(session.user.id, orderNumber) : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <ClearCartOnMount />
      <CheckCircle2Icon className="mx-auto size-12 text-emerald-600" />
      <h1 className="mt-4 text-2xl font-bold">Payment successful</h1>
      {order ? (
        <div className="mt-4 space-y-1 text-sm text-muted-foreground">
          <p>
            Order <span className="font-mono font-medium text-foreground">{order.orderNumber}</span> for{" "}
            <span className="font-semibold text-foreground">{formatNpr(order.total)}</span> has been confirmed.
          </p>
          <p>You will receive updates as we process your delivery.</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Your payment has been confirmed.</p>
      )}
      <div className="mt-8 flex justify-center gap-3">
        {order && (
          <Button asChild>
            <Link href={`/account/orders/${order.orderNumber}`}>View order</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
