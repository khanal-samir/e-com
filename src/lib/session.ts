import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth, type Session } from "@/lib/auth";

export const getSession = cache(async (): Promise<Session | null> => {
  return auth.api.getSession({ headers: await headers() });
});

export function isAdmin(session: Session | null) {
  return session?.user?.role === "admin";
}

export async function requireUser(nextPath?: string) {
  const session = await getSession();
  if (!session) redirect(nextPath ? `/sign-in?next=${encodeURIComponent(nextPath)}` : "/sign-in");
  return session;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (!isAdmin(session)) redirect("/");
  return session;
}
