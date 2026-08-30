import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNpr(amount: number) {
  return `Rs. ${new Intl.NumberFormat("en-IN").format(amount)}`;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Display label for a payment row's provider (or the absence of one = COD). */
export function paymentMethodLabel(provider?: string | null): string {
  if (provider === "khalti") return "Khalti";
  if (provider === "esewa") return "eSewa";
  if (provider === "cod") return "Cash on Delivery";
  return provider ? provider : "Cash on Delivery";
}

/** COD orders skip payment processing — show "Processed" instead of "Processing". */
export function orderStatusLabel(status: string, isCod = false): string {
  if (isCod && status === "processing") return "Processed";
  return status.replace(/_/g, " ");
}
