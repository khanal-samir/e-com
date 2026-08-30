"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDownIcon, LayoutDashboardIcon, LogOutIcon, PackageIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useMounted } from "@/hooks/use-mounted";

/**
 * Self-contained account chip: resolves its own session on the client so the
 * navbar never waits for auth data. Only this chip shows a loading state.
 */
export function AccountMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useMounted();
  const [isPending, startTransition] = useTransition();
  const sessionState = authClient.useSession();
  const session = sessionState.data;
  const user = session?.user;

  if (pathname.startsWith("/admin")) return null;

  // only the chip itself shows a loading state
  if (!mounted || sessionState.isPending) {
    return <Skeleton className="size-9 rounded-full" aria-hidden />;
  }

  if (!user) {
    return (
      <Button asChild variant="ghost" size="icon" aria-label="Sign in">
        <Link href="/sign-in">
          <UserIcon className="size-5" />
        </Link>
      </Button>
    );
  }

  const signOut = () => {
    startTransition(async () => {
      await authClient.signOut();
      router.push("/");
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5" disabled={isPending} aria-label="Account menu">
          <UserIcon className="size-5" />
          <span className="hidden max-w-24 truncate sm:inline">{user.name}</span>
          <ChevronDownIcon className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="truncate">{user.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.role !== "admin" && (
          <DropdownMenuItem asChild>
            <Link href="/account/orders">
              <PackageIcon className="size-4" /> My orders
            </Link>
          </DropdownMenuItem>
        )}
        {user.role === "admin" && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <LayoutDashboardIcon className="size-4" /> Admin panel
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
          <LogOutIcon className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
