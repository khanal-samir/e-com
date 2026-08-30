"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LaptopIcon, LayoutDashboardIcon, CreditCardIcon, PackageIcon, LogOutIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/admin/products", label: "Products", icon: LaptopIcon },
  { href: "/admin/orders", label: "Orders", icon: PackageIcon },
  { href: "/admin/payments", label: "Payments", icon: CreditCardIcon },
];

export function AdminSidebar({ user }: { user: { name: string; email: string } }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="flex w-full flex-col md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:overflow-y-auto md:border-r">
      <div className="p-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          SS<span className="text-primary">Tech</span>
        </Link>
        <p className="text-xs text-muted-foreground">Admin panel</p>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col" aria-label="Admin navigation">
        {links.map((link) => {
          const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent",
              )}
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t p-4">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start"
          onClick={async () => {
            await authClient.signOut();
            router.push("/");
          }}
        >
          <LogOutIcon className="size-4" /> Sign out
        </Button>
      </div>
    </aside>
  );
}
