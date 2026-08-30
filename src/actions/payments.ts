"use server";

import { revalidatePath } from "next/cache";
import { recheckPaymentStatus } from "@/lib/payments";
import { getSession, isAdmin } from "@/lib/session";

export interface RecheckState {
  ok?: boolean;
  message?: string;
  error?: string;
}

export async function recheckPaymentAction(_prev: RecheckState, formData: FormData): Promise<RecheckState> {
  const session = await getSession();
  if (!isAdmin(session)) return { error: "Unauthorized" };
  const paymentId = String(formData.get("paymentId") ?? "");
  if (!paymentId) return { error: "Missing payment id" };
  const result = await recheckPaymentStatus(paymentId);
  revalidatePath("/admin/payments");
  if (!result.ok) return { error: result.error };
  return { ok: true, message: result.message };
}
