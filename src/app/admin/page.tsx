import Link from "next/link";
import { AlertTriangleIcon, CreditCardIcon, LaptopIcon, PackageIcon, WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminStats } from "@/lib/queries";
import { releaseExpiredOrders } from "@/lib/orders";
import { formatNpr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await releaseExpiredOrders();
  const stats = await getAdminStats();

  const cards = [
    { title: "Active products", value: stats.activeProducts, icon: LaptopIcon, href: "/admin/products" },
    { title: "Low stock (<5)", value: stats.lowStock, icon: AlertTriangleIcon, href: "/admin/products" },
    { title: "Total orders", value: stats.totalOrders, icon: PackageIcon, href: "/admin/orders" },
    { title: "Pending payments", value: stats.pendingPayments, icon: CreditCardIcon, href: "/admin/payments" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Store overview</p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">Add product</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="py-4 transition-colors hover:border-primary">
              <CardHeader className="flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletIcon className="size-4 text-primary" /> Online revenue (confirmed)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-baseline gap-6">
          <p className="text-3xl font-bold text-primary">{formatNpr(stats.revenue)}</p>
          <p className="text-sm text-muted-foreground">
            {stats.paidOrders} paid order{stats.paidOrders === 1 ? "" : "s"} · {stats.pendingOrders} awaiting payment
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
