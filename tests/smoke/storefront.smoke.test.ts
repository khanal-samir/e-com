import { describe, expect, it } from "vitest";

/**
 * Smoke tests run against a live deployment (preview or production).
 * Set SMOKE_BASE_URL before running: SMOKE_BASE_URL=https://… npm run test:smoke
 */
const BASE_URL = process.env.SMOKE_BASE_URL?.replace(/\/$/, "");

describe.skipIf(!BASE_URL)("live deployment", () => {
  it("health endpoint reports app + database OK", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; checks: Record<string, boolean> };
    expect(body.ok).toBe(true);
    expect(body.checks.database).toBe(true);
  });

  it("home page renders the storefront", async () => {
    const res = await fetch(`${BASE_URL}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/SS\s*<[^>]*>?Tech/);
    expect(html).toContain("Laptops");
  });

  it("products page renders with seeded data", async () => {
    const res = await fetch(`${BASE_URL}/products`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("laptops");
    expect(html).not.toMatch(/Internal Server Error|Application error/i);
  });

  it("a product detail page is reachable from the catalogue", async () => {
    const res = await fetch(`${BASE_URL}/products`);
    const html = await res.text();
    const match = html.match(/\/products\/([a-z0-9-]+)/);
    expect(match).not.toBeNull();
    const detail = await fetch(`${BASE_URL}/products/${match![1]}`);
    expect(detail.status).toBe(200);
    expect(await detail.text()).toContain("Specifications");
  });

  it("search works", async () => {
    const res = await fetch(`${BASE_URL}/products?q=nonexistent-xyz-123`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("No laptops found");
  });

  it("sign-in page offers email auth", async () => {
    const res = await fetch(`${BASE_URL}/sign-in`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Sign in");
  });

  it("admin is protected from anonymous access", async () => {
    const res = await fetch(`${BASE_URL}/admin`, { redirect: "manual" });
    expect([302, 303, 307, 308]).toContain(res.status);
    expect(res.headers.get("location")).toContain("/sign-in");
  });

  it("checkout requires a session", async () => {
    const res = await fetch(`${BASE_URL}/checkout`, { redirect: "manual" });
    expect([302, 303, 307, 308]).toContain(res.status);
  });
});
