import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout-form";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await requireUser("/checkout");
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Checkout</h1>
      <CheckoutForm
        user={{ name: session.user.name, email: session.user.email }}
        testCredentials={{
          esewa: { id: "9711111111 / 9711111112 / 9711111113", password: "Test@123", mpin: "1122", token: "123456" },
          khalti: { id: "9800000000 – 9800000005", mpin: "1111", otp: "987654" },
        }}
      />
    </div>
  );
}
