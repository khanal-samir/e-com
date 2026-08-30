import { describe, expect, it } from "vitest";
import { checkoutSchema, productFormSchema, shippingSchema } from "@/lib/validators";

describe("shipping validation", () => {
  it("accepts valid Nepali mobile numbers", () => {
    expect(shippingSchema.safeParse({ customerName: "Ram Bahadur", email: "ram@example.com", phone: "9812345678", province: "Bagmati", city: "Kathmandu", address: "Ward 10, Thamel" }).success).toBe(true);
    expect(shippingSchema.safeParse({ customerName: "Ram Bahadur", email: "ram@example.com", phone: "9712345678", province: "Bagmati", city: "Kathmandu", address: "Ward 10, Thamel" }).success).toBe(true);
  });

  it("rejects malformed phones", () => {
    expect(shippingSchema.safeParse({ customerName: "Ram Bahadur", email: "ram@example.com", phone: "123", province: "Bagmati", city: "Kathmandu", address: "Ward 10" }).success).toBe(false);
  });
});

describe("checkout validation", () => {
  const shipping = { customerName: "Sita Sharma", email: "sita@example.com", phone: "9812345678", province: "Bagmati", city: "Lalitpur", address: "Jhamsikhel, Ward 3" };

  it("rejects an empty cart", () => {
    expect(checkoutSchema.safeParse({ items: [], shipping }).success).toBe(false);
  });

  it("clamps and validates quantity ranges", () => {
    expect(checkoutSchema.safeParse({ items: [{ productId: crypto.randomUUID(), quantity: 11 }], shipping }).success).toBe(false);
    expect(checkoutSchema.safeParse({ items: [{ productId: crypto.randomUUID(), quantity: 1 }], shipping }).success).toBe(true);
  });
});

describe("product form validation", () => {
  const base = { name: "Test Laptop", brandId: crypto.randomUUID(), sku: "SST-001", price: "100000", stock: "5", status: "active", images: [] };

  it("accepts a minimal valid product", () => {
    const res = productFormSchema.safeParse(base);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.price).toBe(100000);
      expect(res.data.compareAtPrice).toBeNull();
    }
  });

  it("rejects zero/negative price", () => {
    expect(productFormSchema.safeParse({ ...base, price: "0" }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...base, price: "-5" }).success).toBe(false);
  });
});
