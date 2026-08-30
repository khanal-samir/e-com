import { z } from "zod";

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10),
});

export const shippingSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z
    .string()
    .trim()
    .regex(/^9[678]\d{8}$|^\d{7,10}$/, "Enter a valid Nepali phone number"),
  province: z.string().trim().min(2).max(60),
  city: z.string().trim().min(2).max(60),
  address: z.string().trim().min(5).max(250),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1, "Cart is empty").max(20),
  shipping: shippingSchema,
  paymentMethod: z.enum(["cod", "esewa", "khalti"]).default("esewa"),
});

const optionalText = (max = 200) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v))
    .nullable();

const optionalInt = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => (v === "" || v === null || v === undefined ? null : Number(v)))
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0), "Must be a positive number");

export const productFormSchema = z.object({
  name: z.string().trim().min(3).max(150),
  brandId: z.string().uuid("Select a brand"),
  sku: z.string().trim().min(2).max(50),
  shortDescription: optionalText(300),
  description: optionalText(5000),
  price: z.coerce.number().int().min(1).max(10_000_000),
  compareAtPrice: optionalInt,
  stock: z.coerce.number().int().min(0).max(10000),
  status: z.enum(["draft", "active", "archived"]),
  featured: z.coerce.boolean().default(false),
  processor: optionalText(150),
  processorBrand: optionalText(50),
  graphics: optionalText(150),
  ramGb: optionalInt,
  storageGb: optionalInt,
  storageType: optionalText(30),
  screenSize: optionalText(30),
  refreshRate: optionalText(30),
  operatingSystem: optionalText(50),
  warranty: optionalText(100),
  images: z
    .array(
      z.object({
        imagekitFileId: z.string().optional().nullable(),
        path: z.string().optional().nullable(),
        url: z.string().min(1),
        alt: z.string().max(200).optional().nullable(),
      }),
    )
    .max(8, "At most 8 images")
    .default([]),
});

export type ProductFormInput = z.input<typeof productFormSchema>;
export type ProductFormData = z.output<typeof productFormSchema>;

export const NEPAL_PROVINCES = [
  "Bagmati",
  "Koshi",
  "Madhesh",
  "Gandaki",
  "Lumbini",
  "Karnali",
  "Sudurpashchim",
] as const;
