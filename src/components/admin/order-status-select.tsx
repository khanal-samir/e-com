"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOrderStatus } from "@/actions/orders";

const OPTIONS: { value: string; label: string }[] = [
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancel order" },
];

export function OrderStatusSelect({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const options = OPTIONS.filter((o) => {
    if (currentStatus === "pending_payment" || currentStatus === "payment_review") return false;
    if (currentStatus === "processing") return o.value !== "processing";
    if (currentStatus === "shipped") return o.value === "delivered";
    if (currentStatus === "delivered" || currentStatus === "cancelled") return false;
    return true; // paid → all
  });

  if (!options.length) return <span className="text-xs text-muted-foreground">No further changes</span>;

  return (
    <Select
      disabled={isPending}
      onValueChange={(value) => {
        startTransition(async () => {
          const result = await updateOrderStatus(orderId, value);
          if (result.ok) {
            toast.success(`Order marked as ${value}`);
            router.refresh();
          } else {
            toast.error(result.error ?? "Failed to update order");
          }
        });
      }}
    >
      <SelectTrigger className="h-8 w-40 text-xs" aria-label="Update order status">
        <SelectValue placeholder="Move to…" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.value === "cancelled" ? "Cancel order" : o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
