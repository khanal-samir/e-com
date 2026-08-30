"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import { brand, product, productImage } from "@/db/schema";
import { deleteImageKitFile } from "@/lib/imagekit";
import { getSession, isAdmin } from "@/lib/session";
import { slugify } from "@/lib/utils";
import { productFormSchema } from "@/lib/validators";

export interface ActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

async function requireAdminSession() {
  const session = await getSession();
  if (!isAdmin(session)) throw new Error("Unauthorized");
  return session;
}

async function uniqueSlug(name: string, excludeId?: string) {
  const base = slugify(name) || "laptop";
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const existing = await db
      .select({ id: product.id })
      .from(product)
      .where(excludeId ? and(eq(product.slug, slug), ne(product.id, excludeId)) : eq(product.slug, slug))
      .limit(1);
    if (!existing[0]) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

async function syncImages(
  productId: string,
  images: { imagekitFileId?: string | null; path?: string | null; url: string; alt?: string | null }[],
) {
  const current = await db
    .select()
    .from(productImage)
    .where(eq(productImage.productId, productId));

  const keptIds = new Set(images.map((i) => i.imagekitFileId).filter(Boolean) as string[]);
  for (const img of current) {
    if (img.imagekitFileId && !keptIds.has(img.imagekitFileId)) {
      await deleteImageKitFile(img.imagekitFileId);
    }
  }
  await db.delete(productImage).where(eq(productImage.productId, productId));
  if (images.length) {
    await db.insert(productImage).values(
      images.map((img, idx) => ({
        productId,
        imagekitFileId: img.imagekitFileId || null,
        path: img.path || null,
        url: img.url,
        alt: img.alt || null,
        position: idx,
      })),
    );
  }
}

function parseProductForm(formData: FormData) {
  const imagesRaw = formData.get("images");
  let images: unknown = [];
  try {
    images = imagesRaw ? JSON.parse(String(imagesRaw)) : [];
  } catch {
    images = [];
  }
  return productFormSchema.safeParse({
    name: formData.get("name"),
    brandId: formData.get("brandId"),
    sku: formData.get("sku"),
    shortDescription: formData.get("shortDescription") ?? "",
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice"),
    stock: formData.get("stock"),
    status: formData.get("status") ?? "draft",
    featured: formData.get("featured") === "on" || formData.get("featured") === "true",
    processor: formData.get("processor") ?? "",
    processorBrand: formData.get("processorBrand") ?? "",
    graphics: formData.get("graphics") ?? "",
    ramGb: formData.get("ramGb"),
    storageGb: formData.get("storageGb"),
    storageType: formData.get("storageType") ?? "",
    screenSize: formData.get("screenSize") ?? "",
    refreshRate: formData.get("refreshRate") ?? "",
    operatingSystem: formData.get("operatingSystem") ?? "",
    warranty: formData.get("warranty") ?? "",
    images,
  });
}

function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdminSession();
    const parsed = parseProductForm(formData);
    if (!parsed.success) return { error: "Please fix the highlighted fields", fieldErrors: zodFieldErrors(parsed.error) };
    const data = parsed.data;
    const brandExists = await db.select({ id: brand.id }).from(brand).where(eq(brand.id, data.brandId)).limit(1);
    if (!brandExists[0]) return { error: "Selected brand does not exist" };

    const slug = await uniqueSlug(data.name);
    const [created] = await db
      .insert(product)
      .values({
        brandId: data.brandId,
        name: data.name,
        slug,
        sku: data.sku,
        shortDescription: data.shortDescription,
        description: data.description,
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        stock: data.stock,
        status: data.status,
        featured: data.featured,
        processor: data.processor,
        processorBrand: data.processorBrand,
        graphics: data.graphics,
        ramGb: data.ramGb,
        storageGb: data.storageGb,
        storageType: data.storageType,
        screenSize: data.screenSize,
        refreshRate: data.refreshRate,
        operatingSystem: data.operatingSystem,
        warranty: data.warranty,
      })
      .returning({ id: product.id });

    await syncImages(created.id, data.images);
    revalidatePath("/admin/products");
    revalidatePath("/products");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { error: err instanceof Error && err.message === "Unauthorized" ? "Unauthorized" : "Failed to create product" };
  }
}

export async function updateProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdminSession();
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Missing product id" };
    const parsed = parseProductForm(formData);
    if (!parsed.success) return { error: "Please fix the highlighted fields", fieldErrors: zodFieldErrors(parsed.error) };
    const data = parsed.data;

    const slug = await uniqueSlug(data.name, id);
    const [updated] = await db
      .update(product)
      .set({
        brandId: data.brandId,
        name: data.name,
        slug,
        sku: data.sku,
        shortDescription: data.shortDescription,
        description: data.description,
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        stock: data.stock,
        status: data.status,
        featured: data.featured,
        processor: data.processor,
        processorBrand: data.processorBrand,
        graphics: data.graphics,
        ramGb: data.ramGb,
        storageGb: data.storageGb,
        storageType: data.storageType,
        screenSize: data.screenSize,
        refreshRate: data.refreshRate,
        operatingSystem: data.operatingSystem,
        warranty: data.warranty,
        updatedAt: new Date(),
      })
      .where(eq(product.id, id))
      .returning({ id: product.id });
    if (!updated) return { error: "Product not found" };

    await syncImages(id, data.images);
    revalidatePath("/admin/products");
    revalidatePath("/products");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { error: err instanceof Error && err.message === "Unauthorized" ? "Unauthorized" : "Failed to update product" };
  }
}

export async function setProductStatus(productId: string, status: "draft" | "active" | "archived") {
  try {
    await requireAdminSession();
    await db.update(product).set({ status, updatedAt: new Date() }).where(eq(product.id, productId));
    revalidatePath("/admin/products");
    revalidatePath("/products");
    revalidatePath("/");
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Unauthorized or failed" };
  }
}

export async function deleteProduct(productId: string) {
  try {
    await requireAdminSession();
    const images = await db
      .select()
      .from(productImage)
      .where(eq(productImage.productId, productId));
    for (const img of images) {
      if (img.imagekitFileId) await deleteImageKitFile(img.imagekitFileId);
    }
    await db.delete(product).where(eq(product.id, productId));
    revalidatePath("/admin/products");
    revalidatePath("/products");
    revalidatePath("/");
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Unauthorized or failed" };
  }
}


