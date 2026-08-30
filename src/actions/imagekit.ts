"use server";

import { getSession, isAdmin } from "@/lib/session";
import { getImageKitAuthParams } from "@/lib/imagekit";

export async function getImageKitUploadParams() {
  const session = await getSession();
  if (!isAdmin(session)) return { ok: false as const, error: "Unauthorized" };
  try {
    return { ok: true as const, params: getImageKitAuthParams() };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "ImageKit not configured" };
  }
}
