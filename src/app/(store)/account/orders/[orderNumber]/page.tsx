import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProductImage } from "@/components/product-image";
import { formatNpr, orderStatusLabel, paymentMethodLabel } from "@/lib/utils";
import { requireUser } from "@/lib/session";
import { getUserOrder } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const session = await requireUser("/account/orders");
  const order = await getUserOrder(session.user.id, orderNumber);
  if (!order) notFound();

  const pay = order.payments[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Placed {order.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <Badge variant={order.status === "paid" || order.status === "delivered" ? "success" : order.status === "cancelled" ? "destructive" : "warning"}>
          {orderStatusLabel(order.status, order.payments.length === 0)}
        </Badge>
      </div>

      <section className="rounded-xl border">
        <h2 className="border-b p-4 font-semibold">Items</h2>
        <ul className="divide-y">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 p-4">
              <div className="size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                <ProductImage src={item.imageUrl} alt={item.productName} sizes="56px" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.sku} · Qty {item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold">{formatNpr(item.unitPrice * item.quantity)}</p>
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
            <span>{order.deliveryCharge === 0 ? "Free" : formatNpr(order.deliveryCharge)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatNpr(order.total)}</span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border p-4">
          <h2 className="mb-2 text-sm font-semibold">Delivery address</h2>
          <address className="text-sm not-italic text-muted-foreground">
            {order.customerName}
            <br />
            {order.address}
            <br />
            {order.city}, {order.province}
            <br />
            {order.phone}
          </address>
        </section>
        <section className="rounded-xl border p-4">
          <h2 className="mb-2 text-sm font-semibold">Payment</h2>
          <dl className="space-y-1 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <dt>Method</dt>
              <dd className="text-foreground">{paymentMethodLabel(pay?.provider)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Status</dt>
              <dd className="text-foreground">{pay ? pay.status : "Pay on delivery"}</dd>
            </div>
            {pay?.transactionCode && (
              <div className="flex justify-between">
                <dt>Transaction code</dt>
                <dd className="font-mono text-foreground">{pay.transactionCode}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>
    </div>
  );
}
