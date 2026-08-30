/** Brands are seed-fixed (no admin CRUD); shared by the seed script and header nav. */
export const SEED_BRANDS = ["ASUS", "Acer", "Apple", "Dell", "HP", "Lenovo", "MSI"] as const;

export const brandSlug = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-");
