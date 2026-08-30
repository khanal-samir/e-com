import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNpr, orderStatusLabel } from "@/lib/utils";
import { requireUser } from "@/lib/session";
import { getUserOrders } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My orders" };

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  paid: "success",
  processing: "secondary",
  shipped: "secondary",
  delivered: "success",
  pending_payment: "warning",
  payment_review: "warning",
  cancelled: "destructive",
};

export default async function AccountOrdersPage() {
  const session = await requireUser("/account/orders");
  const orders = await getUserOrders(session.user.id);
  // COD orders have no payment row → their "processing" state reads "Processed"
  const codOrderIds = new Set(orders.filter((o) => !o.hasPayment).map((o) => o.id));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">My orders</h1>

      {!orders.length ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">You have not placed any orders yet.</p>
          <Button asChild className="mt-4">
            <Link href="/products">Browse laptops</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.orderNumber}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition-colors hover:border-primary"
            >
              <div>
                <p className="font-mono text-sm font-medium">{order.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {order.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{formatNpr(order.total)}</span>
                <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>{orderStatusLabel(order.status, codOrderIds.has(order.id))}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
