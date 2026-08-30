import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminOrders } from "@/lib/queries";
import { releaseExpiredOrders } from "@/lib/orders";
import { formatNpr } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUSES = ["all", "pending_payment", "paid", "processing", "shipped", "delivered", "cancelled", "payment_review"];

const PAY_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  complete: "success",
  initiated: "warning",
  pending: "warning",
  ambiguous: "warning",
  failed: "destructive",
  cancelled: "destructive",
  not_found: "destructive",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "all";
  await releaseExpiredOrders();
  const orders = await getAdminOrders(status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">{orders.length} orders</p>
        </div>
        <form action="/admin/orders" method="get" className="flex items-center gap-2">
          <Select name="status" defaultValue={status}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All statuses" : s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button type="submit" className="sr-only">Filter</button>
        </form>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Order status</TableHead>
              <TableHead className="pr-4">Payment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!orders.length && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No orders found.
                </TableCell>
              </TableRow>
            )}
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="pl-4">
                  <Link href={`/admin/orders/${o.id}`} className="font-mono text-sm font-medium hover:text-primary hover:underline">
                    {o.orderNumber}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {o.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </TableCell>
                <TableCell className="text-sm">
                  {o.customerName}
                  <p className="text-xs text-muted-foreground">{o.city}</p>
                </TableCell>
                <TableCell className="text-sm font-medium">{formatNpr(o.total)}</TableCell>
                <TableCell>
                  <Badge variant={o.status === "cancelled" ? "destructive" : o.status === "pending_payment" ? "warning" : o.status === "delivered" ? "success" : "secondary"}>
                    {o.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="pr-4">
                  {o.paymentStatus ? (
                    <Badge variant={PAY_VARIANT[o.paymentStatus] ?? "secondary"}>{o.paymentStatus}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
