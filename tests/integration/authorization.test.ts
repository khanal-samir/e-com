import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Authorization: server actions must refuse non-admin callers before any
 * mutation. Session lookup is mocked; everything else runs for real.
 */
const sessionState: { session: unknown } = { session: null };

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(async () => sessionState.session),
  isAdmin: (s: { user?: { role?: string } } | null) => s?.user?.role === "admin",
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createProduct, setProductStatus, deleteProduct } from "@/actions/products";
import { createTestBrand, createTestProduct, createTestUser, runId } from "../fixtures/database";

beforeEach(() => {
  sessionState.session = null;
});

const formDataFor = (brandId: string, images: unknown[] = []) => {
  const fd = new FormData();
  fd.set("name", `${runId} Admin Test Laptop`);
  fd.set("brandId", brandId);
  fd.set("sku", `${runId}-AUTH-001`.toUpperCase());
  fd.set("price", "99999");
  fd.set("stock", "5");
  fd.set("status", "active");
  fd.set("images", JSON.stringify(images));
  return fd;
};

describe("admin-only product actions", () => {
  it("non-admin users cannot create products", async () => {
    const user = await createTestUser("user");
    sessionState.session = { user };

    const brand = await createTestBrand("auth-brand");
    const res = await createProduct({}, formDataFor(brand.id));

    expect(res.ok).toBeUndefined();
    expect(res.error).toBe("Unauthorized");
  });

  it("anonymous callers cannot create products", async () => {
    sessionState.session = null;
    const brand = await createTestBrand("auth-brand2");
    const res = await createProduct({}, formDataFor(brand.id));
    expect(res.error).toBe("Unauthorized");
  });

  it("admins can create products", async () => {
    const admin = await createTestUser("admin");
    sessionState.session = { user: admin };

    const brand = await createTestBrand("auth-brand3");
    const res = await createProduct({}, formDataFor(brand.id, [{ url: "https://example.com/a.jpg", alt: "a" }]));

    expect(res.ok).toBe(true);
  });

  it("non-admin users cannot change status or delete", async () => {
    const user = await createTestUser("user");
    sessionState.session = { user };
    const brand = await createTestBrand("auth-brand4");
    const p = await createTestProduct(brand.id);

    const statusRes = await setProductStatus(p.id, "archived");
    expect(statusRes.ok).toBe(false);

    const delRes = await deleteProduct(p.id);
    expect(delRes.ok).toBe(false);

    // product untouched
    const rows = await import("@/db");
    const { product } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [row] = await rows.db.select().from(product).where(eq(product.id, p.id));
    expect(row.status).toBe("active");
  });
});
