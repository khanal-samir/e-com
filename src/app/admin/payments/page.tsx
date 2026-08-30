import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentRecheckButton } from "@/components/admin/payment-recheck-button";
import { getAdminPayments } from "@/lib/queries";
import { formatNpr } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAY_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  complete: "success",
  initiated: "warning",
  pending: "warning",
  ambiguous: "warning",
  failed: "destructive",
  cancelled: "destructive",
  not_found: "destructive",
  full_refund: "secondary",
  partial_refund: "secondary",
};

const RECHECKABLE = new Set(["initiated", "pending", "ambiguous"]);

export default async function AdminPaymentsPage() {
  const payments = await getAdminPayments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment history</h1>
        <p className="text-sm text-muted-foreground">All online transactions, newest first</p>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Date</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Transaction UUID</TableHead>
              <TableHead>Provider code</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!payments.length && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  No payments yet. Payments appear here once customers check out.
                </TableCell>
              </TableRow>
            )}
            {payments.map(({ payment, orderNumber, customerName }) => (
              <TableRow key={payment.id}>
                <TableCell className="pl-4 text-sm whitespace-nowrap">
                  {payment.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                  <p className="text-xs text-muted-foreground">
                    {payment.createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </TableCell>
                <TableCell className="font-mono text-sm">{orderNumber}</TableCell>
                <TableCell>
                  <Badge variant={payment.provider === "khalti" ? "secondary" : "default"}>{payment.provider}</Badge>
                </TableCell>
                <TableCell className="text-sm">{customerName}</TableCell>
                <TableCell className="font-mono text-xs">{payment.transactionUuid}</TableCell>
                <TableCell className="font-mono text-xs">{payment.transactionCode ?? "—"}</TableCell>
                <TableCell className="text-sm font-medium">{formatNpr(payment.amount)}</TableCell>
                <TableCell>
                  <Badge variant={PAY_VARIANT[payment.status] ?? "secondary"}>{payment.status}</Badge>
                </TableCell>
                <TableCell className="pr-4 text-right">
                  {RECHECKABLE.has(payment.status) ? (
                    <PaymentRecheckButton paymentId={payment.id} />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {payment.verifiedAt?.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) ?? "—"}
                    </span>
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
