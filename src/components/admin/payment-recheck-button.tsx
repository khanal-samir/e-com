"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { recheckPaymentAction, type RecheckState } from "@/actions/payments";

export function PaymentRecheckButton({ paymentId }: { paymentId: string }) {
  const [state, action, isPending] = useActionState<RecheckState, FormData>(recheckPaymentAction, {});
  return (
    <form action={action} className="inline">
      <input type="hidden" name="paymentId" value={paymentId} />
      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        {isPending ? "Checking…" : "Recheck with eSewa"}
      </Button>
      {state.error && <p className="mt-1 text-xs text-destructive">{state.error}</p>}
      {state.message && <p className="mt-1 text-xs text-emerald-600">{state.message}</p>}
    </form>
  );
}
