import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/** Deployment smoke endpoint: app up + database reachable + config present. */
export async function GET() {
  const checks: Record<string, boolean> = {
    app: true,
    database: false,
    imagekit: Boolean(process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT && process.env.IMAGEKIT_PRIVATE_KEY),
    esewa: Boolean(process.env.ESEWA_SECRET_KEY),
    auth: Boolean(process.env.BETTER_AUTH_SECRET),
  };

  try {
    await db.execute(sql`select 1`);
    checks.database = true;
  } catch (err) {
    console.error("Health check DB failure:", err);
  }

  const ok = Object.values(checks).every(Boolean);
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
