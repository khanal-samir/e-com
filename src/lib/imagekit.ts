import "server-only";
import crypto from "node:crypto";

const ikConfig = () => ({
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "",
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
});

export interface ImageKitAuthParams {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
}

/** Short-lived browser upload authentication parameters. Admin-only callers. */
export function getImageKitAuthParams(): ImageKitAuthParams {
  const { publicKey, privateKey } = ikConfig();
  if (!publicKey || !privateKey) {
    throw new Error("ImageKit is not configured (missing public or private key)");
  }
  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 600; // 10 minutes
  const signature = crypto
    .createHmac("sha1", privateKey)
    .update(token + expire)
    .digest("hex");
  return { token, expire, signature, publicKey };
}

/** Deletes a file from ImageKit. Best-effort: failures are logged, not thrown. */
export async function deleteImageKitFile(fileId: string) {
  const { privateKey } = ikConfig();
  if (!privateKey || !fileId) return;
  try {
    await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`,
      },
    });
  } catch (err) {
    console.error("ImageKit delete failed:", err);
  }
}
