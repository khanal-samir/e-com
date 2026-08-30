"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BanknoteIcon, SmartphoneIcon, WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EsewaRedirectForm } from "@/components/esewa-redirect-form";
import { KhaltiRedirect } from "@/components/khalti-redirect";
import { checkoutAction, type CheckoutActionState } from "@/actions/checkout";
import { useCart } from "@/lib/cart";
import { useMounted } from "@/hooks/use-mounted";
import { deliveryChargeFor } from "@/lib/pricing";
import { cn, formatNpr } from "@/lib/utils";
import { NEPAL_PROVINCES } from "@/lib/validators";

const METHODS = [
  { value: "cod", label: "Cash on Delivery", hint: "Pay cash when your laptop arrives", icon: BanknoteIcon },
  { value: "esewa", label: "eSewa", hint: "Pay now with your eSewa wallet (test mode)", icon: WalletIcon },
  { value: "khalti", label: "Khalti", hint: "Pay now with your Khalti wallet (test mode)", icon: SmartphoneIcon },
] as const;

export interface TestCredentials {
  esewa: { id: string; password: string; mpin: string; token: string };
  khalti: { id: string; mpin: string; otp: string };
}

export function CheckoutForm({ user, testCredentials }: { user: { name: string; email: string }; testCredentials: TestCredentials }) {
  const router = useRouter();
  const { items, subtotal, clear, ready } = useCart();
  const mounted = useMounted();
  const [state, action, isPending] = useActionState<CheckoutActionState, FormData>(checkoutAction, {});
  const [paymentMethod, setPaymentMethod] = useState<string>("esewa");
  const [submitting, setSubmitting] = useState(false);
  const delivery = deliveryChargeFor(subtotal);

  useEffect(() => {
    if (state.error) {
      queueMicrotask(() => {
        toast.error(state.error);
        setSubmitting(false);
      });
    }
  }, [state]);

  // COD → clear cart and go to the order page (hook must run before any early return)
  useEffect(() => {
    if (submitting && state.orderNumber) {
      clear();
      router.push(`/account/orders/${state.orderNumber}`);
    }
  }, [submitting, state, clear, router]);

  // eSewa → auto-post the signed form. Cart is preserved so a failed
  // payment drops the user back on a ready-to-retry cart.
  if (submitting && state.esewa) {
    return <EsewaRedirectForm esewa={state.esewa} />;
  }

  // Khalti → browser redirect
  if (submitting && state.khaltiPaymentUrl) {
    return <KhaltiRedirect url={state.khaltiPaymentUrl} />;
  }

  if (submitting && state.orderNumber) {
    return (
      <div className="py-16 text-center">
        <p className="font-medium">Order placed!</p>
        <p className="mt-1 text-sm text-muted-foreground">Pay cash on delivery. Taking you to your order…</p>
      </div>
    );
  }

  if (!mounted || !ready) return <p className="py-16 text-center text-muted-foreground">Loading…</p>;

  if (!items.length) {
    return <p className="py-16 text-center text-muted-foreground">Your cart is empty. Add a laptop before checkout.</p>;
  }

  return (
    <form
      action={(fd) => {
        setSubmitting(true);
        action(fd);
      }}
      className="grid gap-8 lg:grid-cols-[1fr_360px]"
    >
      <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ productId: i.productId, quantity: i.quantity })))} />
      <input type="hidden" name="paymentMethod" value={paymentMethod} />

      <div className="space-y-6">
        <section className="rounded-xl border p-6">
          <h2 className="mb-4 font-semibold">Shipping details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customerName">Full name</Label>
              <Input id="customerName" name="customerName" defaultValue={user.name} required minLength={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={user.email} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" placeholder="98XXXXXXXX" required pattern="[0-9]{7,10}" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="province">Province</Label>
              <Select name="province" required defaultValue="Bagmati">
                <SelectTrigger id="province">
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {NEPAL_PROVINCES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" required placeholder="Kathmandu" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Delivery address</Label>
              <Input id="address" name="address" required placeholder="Ward, street, landmark" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Order notes (optional)</Label>
              <Textarea id="notes" name="notes" rows={2} maxLength={500} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Payment method</h2>
          <div role="radiogroup" aria-label="Payment method" className="space-y-2">
            {METHODS.map((m) => (
              <label
                key={m.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors",
                  paymentMethod === m.value ? "border-primary bg-primary/[0.04]" : "hover:bg-accent/50",
                )}
              >
                <input
                  type="radio"
                  name="methodRadio"
                  value={m.value}
                  checked={paymentMethod === m.value}
                  onChange={() => setPaymentMethod(m.value)}
                  className="accent-[var(--primary)]"
                  aria-label={m.label}
                />
                <m.icon className="size-5 text-muted-foreground" />
                <span>
                  <span className="block text-sm font-medium">{m.label}</span>
                  <span className="block text-xs text-muted-foreground">{m.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {paymentMethod === "esewa" && (
          <section className="rounded-xl border border-dashed border-primary/40 bg-primary/[0.03] p-6">
            <h2 className="mb-1 flex items-center gap-2 font-semibold">
              How to test eSewa
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">UAT</span>
            </h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Official sandbox credentials from developer.esewa.com.np — no real money moves.
            </p>
            <ol className="list-inside list-decimal space-y-1.5 text-sm">
              <li>
                Click <span className="font-medium">Pay with eSewa</span> — you land on{" "}
                <span className="font-mono text-xs">rc-epay.esewa.com.np</span> (the test gateway)
              </li>
              <li>
                Log in with eSewa ID{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{testCredentials.esewa.id}</code> and password{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{testCredentials.esewa.password}</code>
              </li>
              <li>
                If asked for MPIN use{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{testCredentials.esewa.mpin}</code>; enter transaction
                token <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{testCredentials.esewa.token}</code>
              </li>
              <li>Confirm the payment — you are returned here and the order is marked paid</li>
            </ol>
            <p className="mt-3 rounded-md bg-background/70 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Test mode:</span> the gateway is charged a flat{" "}
              <span className="font-mono font-medium text-primary">Rs. 10</span> instead of your order total, so sandbox wallets can always
              cover it. Your order keeps its real amount on our side.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              If the gateway shows &quot;service unavailable&quot;, that is eSewa&apos;s sandbox flaking — retry in a few minutes or pay with
              Khalti instead.
            </p>
          </section>
        )}

        {paymentMethod === "khalti" && (
          <section className="rounded-xl border border-dashed border-primary/40 bg-primary/[0.03] p-6">
            <h2 className="mb-1 flex items-center gap-2 font-semibold">
              How to test Khalti
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">Sandbox</span>
            </h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Official sandbox credentials from docs.khalti.com — wallet payments only, no real money.
            </p>
            <ol className="list-inside list-decimal space-y-1.5 text-sm">
              <li>
                Click <span className="font-medium">Pay with Khalti</span> — you are redirected to{" "}
                <span className="font-mono text-xs">test-pay.khalti.com</span>
              </li>
              <li>
                Enter Khalti ID{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{testCredentials.khalti.id}</code>
              </li>
              <li>
                Enter MPIN <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{testCredentials.khalti.mpin}</code>
              </li>
              <li>
                Enter OTP <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{testCredentials.khalti.otp}</code>
              </li>
              <li>Confirm — you are returned here and the order is marked paid</li>
            </ol>
            <p className="mt-3 rounded-md bg-background/70 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Test mode:</span> the gateway is charged a flat{" "}
              <span className="font-mono font-medium text-primary">Rs. 10</span> instead of your order total, so sandbox wallets can always
              cover it. Your order keeps its real amount on our side.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Cancelled or unfinished payments release the reserved stock immediately.</p>
          </section>
        )}

        {paymentMethod === "cod" && (
          <section className="rounded-xl border border-dashed border-primary/40 bg-primary/[0.03] p-6">
            <h2 className="mb-2 font-semibold">Cash on Delivery</h2>
            <p className="text-sm text-muted-foreground">
              Your order is confirmed immediately. Pay {formatNpr(subtotal + delivery)} in cash when the laptop is delivered.
              Please keep exact change if possible.
            </p>
          </section>
        )}
      </div>

      <div className="h-fit rounded-xl border p-6">
        <h2 className="mb-4 font-semibold">Your order</h2>
        <ul className="space-y-3 text-sm">
          {items.map((i) => (
            <li key={i.productId} className="flex justify-between gap-2">
              <span className="line-clamp-1">
                {i.name} <span className="text-muted-foreground">× {i.quantity}</span>
              </span>
              <span className="shrink-0">{formatNpr(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatNpr(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span>{delivery === 0 ? "Free" : formatNpr(delivery)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatNpr(subtotal + delivery)}</span>
          </div>
        </div>
        <Button type="submit" className="mt-5 w-full" size="lg" disabled={isPending || submitting}>
          {isPending || submitting
            ? "Placing order…"
            : paymentMethod === "cod"
              ? `Place order · ${formatNpr(subtotal + delivery)}`
              : `Pay with ${paymentMethod === "esewa" ? "eSewa" : "Khalti"} · ${formatNpr(subtotal + delivery)}`}
        </Button>
        {paymentMethod !== "cod" && (
          <p className="mt-3 text-center text-xs text-muted-foreground">Stock is reserved for 30 minutes once the order is placed.</p>
        )}
      </div>
    </form>
  );
}
