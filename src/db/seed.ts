/**
 * Idempotent seed: brands, demo laptops (web image URLs stored as plain
 * strings) and the admin user. Safe to run repeatedly.
 *
 * Run with: bunx tsx --env-file=.env.local src/db/seed.ts
 */
import { eq } from "drizzle-orm";
import { db, client } from "@/db";
import { brand, product, productImage, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { SEED_BRANDS } from "@/lib/brands";

const BRANDS = SEED_BRANDS;

const img = (id: string) => `https://images.unsplash.com/${id}?w=800&q=80&auto=format&fit=crop`;

const LAPTOPS = [
  {
    brand: "ASUS", name: "ASUS TUF Gaming F15 FX507ZC4", sku: "SST-ASUS-001", price: 145000, compareAtPrice: 159000, stock: 7, featured: true,
    short: "RTX 3050 gaming laptop with 144Hz display",
    description: "Military-grade durability meets serious gaming performance. The TUF Gaming F15 pairs a 12th-gen Intel Core i5 with an RTX 3050 for smooth 1080p gaming, and its 144Hz panel keeps fast action crisp.",
    processor: "Intel Core i5-12500H", processorBrand: "Intel", graphics: "NVIDIA RTX 3050 4GB", ramGb: 16, storageGb: 512, storageType: "SSD", screenSize: '15.6" FHD', refreshRate: "144Hz", operatingSystem: "Windows 11", warranty: "2 years",
    images: [img("photo-1603302576837-37561b2e2302"), img("photo-1611078489935-0cb964de46d6")],
  },
  {
    brand: "ASUS", name: "ASUS Vivobook 15 X1502ZA", sku: "SST-ASUS-002", price: 82000, stock: 12, featured: false,
    short: "Slim everyday laptop for students",
    description: "A lightweight 15.6-inch laptop with a 12th-gen Core i5, fast SSD storage and all-day battery — ideal for assignments, browsing and streaming.",
    processor: "Intel Core i5-1235U", processorBrand: "Intel", graphics: "Intel Iris Xe", ramGb: 8, storageGb: 512, storageType: "SSD", screenSize: '15.6" FHD', refreshRate: "60Hz", operatingSystem: "Windows 11", warranty: "2 years",
    images: [img("photo-1541807084-5c52b6b3adef")],
  },
  {
    brand: "Acer", name: "Acer Nitro V 15 ANV15-51", sku: "SST-ACER-001", price: 135000, compareAtPrice: 148000, stock: 5, featured: true,
    short: "RTX 4050 gaming with 13th-gen i5",
    description: "The Nitro V 15 brings ray-traced graphics to the mainstream. RTX 4050, a 13th-gen i5 and dual-fan cooling make it a strong entry-level gaming machine.",
    processor: "Intel Core i5-13420H", processorBrand: "Intel", graphics: "NVIDIA RTX 4050 6GB", ramGb: 16, storageGb: 512, storageType: "SSD", screenSize: '15.6" FHD', refreshRate: "144Hz", operatingSystem: "Windows 11", warranty: "2 years",
    images: [img("photo-1618424181497-157f25b6ddd5")],
  },
  {
    brand: "Acer", name: "Acer Aspire 5 A515-45", sku: "SST-ACER-002", price: 78000, stock: 9, featured: false,
    short: "Reliable Ryzen 5 productivity laptop",
    description: "A dependable daily driver: Ryzen 5 7530U, 16GB RAM and a lift-hinged keyboard that stays comfortable through long study sessions.",
    processor: "AMD Ryzen 5 7530U", processorBrand: "AMD", graphics: "AMD Radeon Graphics", ramGb: 16, storageGb: 512, storageType: "SSD", screenSize: '15.6" FHD', refreshRate: "60Hz", operatingSystem: "Windows 11", warranty: "2 years",
    images: [img("photo-1525547719571-a2d4ac8945e2")],
  },
  {
    brand: "Apple", name: 'Apple MacBook Air M2 13"', sku: "SST-APPL-001", price: 165000, compareAtPrice: 179000, stock: 6, featured: true,
    short: "Fanless M2 ultrabook, 18-hour battery",
    description: "The M2 MacBook Air remains the best all-round laptop for students and professionals in Nepal — silent, cool and incredibly efficient with a Liquid Retina display.",
    processor: "Apple M2", processorBrand: "Apple", graphics: "8-core Apple GPU", ramGb: 8, storageGb: 256, storageType: "SSD", screenSize: '13.6" Liquid Retina', refreshRate: "60Hz", operatingSystem: "macOS", warranty: "1 year",
    images: [img("photo-1517336714731-489689fd1ca8"), img("photo-1496181133206-80ce9b88a853")],
  },
  {
    brand: "Apple", name: 'Apple MacBook Pro M3 14"', sku: "SST-APPL-002", price: 249000, stock: 3, featured: false,
    short: "Pro performance with mini-LED XDR display",
    description: "For creators who need sustained power: the M3 chip with ProMotion XDR display, excellent speakers and all-day battery life.",
    processor: "Apple M3", processorBrand: "Apple", graphics: "10-core Apple GPU", ramGb: 8, storageGb: 512, storageType: "SSD", screenSize: '14.2" Liquid Retina XDR', refreshRate: "120Hz", operatingSystem: "macOS", warranty: "1 year",
    images: [img("photo-1588872657578-7efd1f1555ed")],
  },
  {
    brand: "Dell", name: "Dell Inspiron 15 3520", sku: "SST-DELL-001", price: 75000, stock: 10, featured: false,
    short: "Budget-friendly 12th-gen i5 daily laptop",
    description: "A practical choice for home and college use with a comfortable keyboard, decent speakers and easy upgrade options.",
    processor: "Intel Core i5-1235U", processorBrand: "Intel", graphics: "Intel Iris Xe", ramGb: 8, storageGb: 512, storageType: "SSD", screenSize: '15.6" FHD', refreshRate: "120Hz", operatingSystem: "Windows 11", warranty: "1 year",
    images: [img("photo-1593642632823-8f785ba67e45")],
  },
  {
    brand: "Dell", name: "Dell XPS 13 9315", sku: "SST-DELL-002", price: 210000, stock: 4, featured: false,
    short: "Premium ultraportable with 1TB SSD",
    description: "CNC aluminium, a stunning InfinityEdge display and the efficiency of Intel's P-series silicon make the XPS 13 a premium travel companion.",
    processor: "Intel Core i7-1360P", processorBrand: "Intel", graphics: "Intel Iris Xe", ramGb: 16, storageGb: 1024, storageType: "SSD", screenSize: '13.4" FHD+', refreshRate: "60Hz", operatingSystem: "Windows 11", warranty: "2 years",
    images: [img("photo-1593642702821-c8da6771f0c6")],
  },
  {
    brand: "HP", name: "HP Victus 15-fa0xxx", sku: "SST-HP-001", price: 105000, compareAtPrice: 115000, stock: 8, featured: false,
    short: "Affordable RTX 2050 gaming laptop",
    description: "The Victus 15 balances price and frames with an RTX 2050, 12th-gen i5 and a keyboard that doubles as a solid typing deck.",
    processor: "Intel Core i5-12450H", processorBrand: "Intel", graphics: "NVIDIA RTX 2050 4GB", ramGb: 16, storageGb: 512, storageType: "SSD", screenSize: '15.6" FHD', refreshRate: "144Hz", operatingSystem: "Windows 11", warranty: "1 year",
    images: [img("photo-1661961112951-f2bfd1f253ce")],
  },
  {
    brand: "HP", name: "HP Pavilion 15-eg2xxx", sku: "SST-HP-002", price: 92000, stock: 11, featured: false,
    short: "16GB RAM multimedia laptop",
    description: "With 16GB of RAM and B&O-tuned speakers, the Pavilion 15 is great for presentations, light editing and entertainment.",
    processor: "Intel Core i5-1235U", processorBrand: "Intel", graphics: "Intel Iris Xe", ramGb: 16, storageGb: 512, storageType: "SSD", screenSize: '15.6" FHD', refreshRate: "60Hz", operatingSystem: "Windows 11", warranty: "1 year",
    images: [img("photo-1547036967-23d11aacaee0")],
  },
  {
    brand: "Lenovo", name: "Lenovo IdeaPad Slim 3 15ABR8", sku: "SST-LNV-001", price: 62000, stock: 14, featured: false,
    short: "Most affordable Ryzen 5 laptop",
    description: "Nepal's favourite budget laptop: Ryzen 5 7520U with 8GB RAM and rapid-charge battery at a student-friendly price.",
    processor: "AMD Ryzen 5 7520U", processorBrand: "AMD", graphics: "AMD Radeon 610M", ramGb: 8, storageGb: 256, storageType: "SSD", screenSize: '15.6" FHD', refreshRate: "60Hz", operatingSystem: "Windows 11", warranty: "2 years",
    images: [img("photo-1522199755839-a2bacb67c546")],
  },
  {
    brand: "Lenovo", name: "Lenovo Legion Slim 5 16APH8", sku: "SST-LNV-002", price: 215000, stock: 3, featured: true,
    short: "RTX 4060 slim gaming with 165Hz panel",
    description: "A gaming laptop you can actually carry: Ryzen 7 7840HS, RTX 4060 and a 16-inch 165Hz display in a slim chassis with Lenovo Legion ColdFront cooling.",
    processor: "AMD Ryzen 7 7840HS", processorBrand: "AMD", graphics: "NVIDIA RTX 4060 8GB", ramGb: 16, storageGb: 1024, storageType: "SSD", screenSize: '16" WQXGA', refreshRate: "165Hz", operatingSystem: "Windows 11", warranty: "2 years",
    images: [img("photo-1611078489935-0cb964de46d6"), img("photo-1603302576837-37561b2e2302")],
  },
  {
    brand: "MSI", name: "MSI Katana 15 B13V", sku: "SST-MSI-001", price: 185000, compareAtPrice: 199000, stock: 5, featured: false,
    short: "i7 + RTX 4060 high-FPS gaming",
    description: "The Katana 15 pushes high-refresh gaming with a 13th-gen i7, RTX 4060 and MSI Cooler Boost 5 in a sharp black-and-red design.",
    processor: "Intel Core i7-13620H", processorBrand: "Intel", graphics: "NVIDIA RTX 4060 8GB", ramGb: 16, storageGb: 1024, storageType: "SSD", screenSize: '15.6" FHD', refreshRate: "144Hz", operatingSystem: "Windows 11", warranty: "2 years",
    images: [img("photo-1618424181497-157f25b6ddd5")],
  },
  {
    brand: "MSI", name: "MSI Modern 14 C13M", sku: "SST-MSI-002", price: 72000, stock: 13, featured: false,
    short: "Compact 14-inch work laptop",
    description: "A clean, light 14-inch laptop for office work and classes with a 12th-gen i5 and 16GB RAM.",
    processor: "Intel Core i5-1235U", processorBrand: "Intel", graphics: "Intel Iris Xe", ramGb: 16, storageGb: 512, storageType: "SSD", screenSize: '14" FHD', refreshRate: "60Hz", operatingSystem: "Windows 11", warranty: "2 years",
    images: [img("photo-1587614382346-4ec70e388b28")],
  },
];

async function main() {
  console.log("Seeding SS Tech…");

  // brands
  for (const name of BRANDS) {
    await db
      .insert(brand)
      .values({ name, slug: slugify(name) })
      .onConflictDoNothing();
  }
  const brandRows = await db.select().from(brand);
  const brandBy = Object.fromEntries(brandRows.map((b) => [b.name, b.id]));

  // products
  for (const l of LAPTOPS) {
    const slug = slugify(l.name);
    const existing = await db.select({ id: product.id }).from(product).where(eq(product.slug, slug)).limit(1);
    if (existing[0]) {
      console.log(`  · product exists: ${slug}`);
      continue;
    }
    const [created] = await db
      .insert(product)
      .values({
        brandId: brandBy[l.brand],
        name: l.name,
        slug,
        sku: l.sku,
        shortDescription: l.short,
        description: l.description,
        price: l.price,
        compareAtPrice: l.compareAtPrice ?? null,
        stock: l.stock,
        status: "active",
        featured: l.featured ?? false,
        processor: l.processor,
        processorBrand: l.processorBrand,
        graphics: l.graphics,
        ramGb: l.ramGb,
        storageGb: l.storageGb,
        storageType: l.storageType,
        screenSize: l.screenSize,
        refreshRate: l.refreshRate,
        operatingSystem: l.operatingSystem,
        warranty: l.warranty,
      })
      .returning({ id: product.id });
    await db.insert(productImage).values(
      l.images.map((url, i) => ({
        productId: created.id,
        url,
        alt: `${l.name} image ${i + 1}`,
        position: i,
      })),
    );
    console.log(`  ✓ product: ${slug}`);
  }

  // admin user
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, adminEmail)).limit(1);
    if (existing[0]) {
      await db.update(user).set({ role: "admin", emailVerified: true }).where(eq(user.email, adminEmail));
      console.log("  · admin exists (role ensured)");
    } else {
      const res = await auth.api.signUpEmail({
        body: { name: process.env.ADMIN_NAME || "SS Tech Admin", email: adminEmail, password: adminPassword },
      });
      if (res?.user?.id) {
        await db.update(user).set({ role: "admin", emailVerified: true }).where(eq(user.id, res.user.id));
        console.log(`  ✓ admin created: ${adminEmail}`);
      } else {
        console.error("  ✗ admin creation failed");
      }
    }
  } else {
    console.log("  ! ADMIN_EMAIL/ADMIN_PASSWORD not set — skipped admin seed");
  }

  console.log("Seed complete.");
  await client.end();
}

main().catch(async (err) => {
  console.error(err);
  await client.end();
  process.exit(1);
});
