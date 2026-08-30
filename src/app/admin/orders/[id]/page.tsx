import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { getAdminOrder } from "@/lib/queries";
import { formatNpr, paymentMethodLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {order.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={order.status === "cancelled" ? "destructive" : "secondary"}>{order.status.replace("_", " ")}</Badge>
          <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border p-4">
          <h2 className="mb-2 text-sm font-semibold">Customer</h2>
          <dl className="space-y-1 text-sm text-muted-foreground">
            <div className="flex justify-between gap-4">
              <dt>Name</dt>
              <dd className="text-foreground">{order.customerName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Email</dt>
              <dd className="truncate text-foreground">{order.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Phone</dt>
              <dd className="text-foreground">{order.phone}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-xl border p-4">
          <h2 className="mb-2 text-sm font-semibold">Delivery address</h2>
          <address className="text-sm not-italic text-muted-foreground">
            {order.address}, {order.city}
            <br />
            {order.province}, Nepal
            {order.notes && <p className="mt-2 text-xs">Note: {order.notes}</p>}
          </address>
        </section>
      </div>

      {order.payment && (
        <section className="rounded-xl border p-4">
          <h2 className="mb-2 text-sm font-semibold">{paymentMethodLabel(order.payment.provider)} payment</h2>
          <dl className="grid gap-x-8 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="flex justify-between gap-4">
              <dt>Transaction UUID</dt>
              <dd className="font-mono text-foreground">{order.payment.transactionUuid}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Status</dt>
              <dd className="text-foreground">{order.payment.status}</dd>
            </div>
            {order.payment.transactionCode && (
              <div className="flex justify-between gap-4">
                <dt>Transaction code</dt>
                <dd className="font-mono text-foreground">{order.payment.transactionCode}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt>Verified at</dt>
              <dd className="text-foreground">
                {order.payment.verifiedAt?.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) ?? "—"}
              </dd>
            </div>
          </dl>
        </section>
      )}

      <section className="rounded-xl border">
        <h2 className="border-b p-4 text-sm font-semibold">Items</h2>
        <ul className="divide-y text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">{item.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.sku} · {formatNpr(item.unitPrice)} × {item.quantity}
                </p>
              </div>
              <p className="font-semibold">{formatNpr(item.unitPrice * item.quantity)}</p>
            </li>
          ))}
        </ul>
        <div className="space-y-1.5 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatNpr(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span>{formatNpr(order.deliveryCharge)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatNpr(order.total)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
