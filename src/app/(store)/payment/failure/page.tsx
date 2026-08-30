import type { Metadata } from "next";
import Link from "next/link";
import { XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Payment failed" };

export default function PaymentFailurePage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <XCircleIcon className="mx-auto size-12 text-destructive" />
      <h1 className="mt-4 text-2xl font-bold">Payment was not completed</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The transaction was cancelled or not completed. Your items are still in the cart — you can retry with eSewa, Khalti,
        or switch to cash on delivery.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button asChild>
          <Link href="/cart">Return to cart</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/products">Browse laptops</Link>
        </Button>
      </div>
    </div>
  );
}
