import { describe, expect, it } from "vitest";
import { deliveryChargeFor } from "@/lib/orders";
import { formatNpr, slugify } from "@/lib/utils";

describe("money & charges", () => {
  it("charges flat delivery below the free threshold", () => {
    expect(deliveryChargeFor(99_999)).toBe(500);
    expect(deliveryChargeFor(0)).toBe(500);
  });

  it("gives free delivery at or above Rs. 1,00,000", () => {
    expect(deliveryChargeFor(100_000)).toBe(0);
    expect(deliveryChargeFor(500_000)).toBe(0);
  });

  it("formats NPR with lakh-style grouping", () => {
    expect(formatNpr(145000)).toBe("Rs. 1,45,000");
    expect(formatNpr(62000)).toBe("Rs. 62,000");
  });
});

describe("slugify", () => {
  it("slugifies product names safely", () => {
    expect(slugify('Apple MacBook Air M2 13"')).toBe("apple-macbook-air-m2-13");
    expect(slugify("  HP  Pavilion -- 15! ")).toBe("hp-pavilion-15");
  });
});
