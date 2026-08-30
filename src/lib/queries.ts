import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { brand, order, orderItem, payment, product, productImage } from "@/db/schema";

export interface ProductFilters {
  q?: string;
  brands?: string[]; // brand slugs
  ram?: number[];
  minPrice?: number;
  maxPrice?: number;
  storageType?: string;
  sort?: "newest" | "price-asc" | "price-desc" | "name";
  page?: number;
  perPage?: number;
  inStock?: boolean;
}

const ACTIVE = eq(product.status, "active");

export async function getBrandsWithCounts() {
  const rows = await db
    .select({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      count: sql<number>`count(${product.id}) filter (where ${product.status} = 'active')`.mapWith(Number),
    })
    .from(brand)
    .leftJoin(product, eq(product.brandId, brand.id))
    .groupBy(brand.id)
    .orderBy(asc(brand.name));
  return rows;
}

export async function searchProducts(filters: ProductFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = filters.perPage ?? 12;
  const conditions = [ACTIVE];

  if (filters.q) {
    const like = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(product.name, like),
        ilike(product.sku, like),
        ilike(product.processor, like),
        ilike(product.graphics, like),
        ilike(brand.name, like),
      )!,
    );
  }
  if (filters.brands?.length) conditions.push(inArray(brand.slug, filters.brands));
  if (filters.ram?.length) conditions.push(inArray(product.ramGb, filters.ram));
  if (filters.minPrice != null) conditions.push(gte(product.price, filters.minPrice));
  if (filters.maxPrice != null) conditions.push(lte(product.price, filters.maxPrice));
  if (filters.storageType) conditions.push(eq(product.storageType, filters.storageType));
  if (filters.inStock) conditions.push(gte(product.stock, 1));

  const where = and(...conditions);

  const orderBy =
    filters.sort === "price-asc"
      ? asc(product.price)
      : filters.sort === "price-desc"
        ? desc(product.price)
        : filters.sort === "name"
          ? asc(product.name)
          : desc(product.createdAt);

  const [items, countRows] = await Promise.all([
    db
      .select({
        product,
        brandName: brand.name,
        brandSlug: brand.slug,
        image: sql<string | null>`(
          select url from product_image pi
          where pi.product_id = ${product.id}
          order by pi.position asc limit 1
        )`,
      })
      .from(product)
      .innerJoin(brand, eq(product.brandId, brand.id))
      .where(where)
      .orderBy(orderBy)
      .limit(perPage)
      .offset((page - 1) * perPage),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(product)
      .innerJoin(brand, eq(product.brandId, brand.id))
      .where(where),
  ]);

  const total = countRows[0]?.count ?? 0;
  return {
    items: items.map((r) => ({ ...r.product, brandName: r.brandName, brandSlug: r.brandSlug, image: r.image })),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export type ProductListItem = Awaited<ReturnType<typeof searchProducts>>["items"][number];

const productImageSub = sql<string | null>`(
  select url from product_image pi
  where pi.product_id = ${product.id}
  order by pi.position asc limit 1
)`;

export async function getFeaturedProducts(limit = 8) {
  const rows = await db
    .select({ product, brandName: brand.name, brandSlug: brand.slug, image: productImageSub })
    .from(product)
    .innerJoin(brand, eq(product.brandId, brand.id))
    .where(and(ACTIVE, eq(product.featured, true)))
    .orderBy(desc(product.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r.product, brandName: r.brandName, brandSlug: r.brandSlug, image: r.image }));
}

export async function getNewArrivals(limit = 8) {
  const rows = await db
    .select({ product, brandName: brand.name, brandSlug: brand.slug, image: productImageSub })
    .from(product)
    .innerJoin(brand, eq(product.brandId, brand.id))
    .where(ACTIVE)
    .orderBy(desc(product.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r.product, brandName: r.brandName, brandSlug: r.brandSlug, image: r.image }));
}

export async function getProductBySlug(slug: string) {
  const rows = await db
    .select({ product, brandName: brand.name, brandSlug: brand.slug })
    .from(product)
    .innerJoin(brand, eq(product.brandId, brand.id))
    .where(and(eq(product.slug, slug), ACTIVE))
    .limit(1);
  if (!rows[0]) return null;
  const images = await db
    .select()
    .from(productImage)
    .where(eq(productImage.productId, rows[0].product.id))
    .orderBy(asc(productImage.position));
  return { ...rows[0].product, brandName: rows[0].brandName, brandSlug: rows[0].brandSlug, images };
}

export async function getRelatedProducts(productId: string, brandId: string, limit = 4) {
  const rows = await db
    .select({ product, brandName: brand.name, brandSlug: brand.slug, image: productImageSub })
    .from(product)
    .innerJoin(brand, eq(product.brandId, brand.id))
    .where(
      and(
        ACTIVE,
        gte(product.stock, 1),
        sql`${product.id} <> ${productId}`,
        or(
          eq(product.brandId, brandId),
          sql`abs(${product.price} - (select price from product p2 where p2.id = ${productId})) <= 50000`,
        )!,
      ),
    )
    .orderBy(sql`case when ${product.brandId} = ${brandId} then 0 else 1 end`, asc(sql`abs(${product.price} - (select price from product p2 where p2.id = ${productId}))`))
    .limit(limit);
  return rows.map((r) => ({ ...r.product, brandName: r.brandName, brandSlug: r.brandSlug, image: r.image }));
}

export async function getFilterFacets() {
  const rows = await db
    .select({
      ramGb: product.ramGb,
      storageType: product.storageType,
      minPrice: sql<number>`min(${product.price})`.mapWith(Number),
      maxPrice: sql<number>`max(${product.price})`.mapWith(Number),
    })
    .from(product)
    .where(ACTIVE)
    .groupBy(product.ramGb, product.storageType);
  const rams = [...new Set(rows.map((r) => r.ramGb).filter((v): v is number => v != null))].sort((a, b) => a - b);
  const storageTypes = [...new Set(rows.map((r) => r.storageType).filter((v): v is string => v != null))].sort();
  const minPrice = Math.min(...rows.map((r) => r.minPrice), 0);
  const maxPrice = Math.max(...rows.map((r) => r.maxPrice), 0);
  return { rams, storageTypes, minPrice, maxPrice };
}

/* ---------------- Customer orders ---------------- */

export async function getUserOrders(userId: string) {
  const orders = await db.select().from(order).where(eq(order.userId, userId)).orderBy(desc(order.createdAt));
  if (!orders.length) return [];
  // which orders have a payment row (online) vs none (COD)
  const ids = orders.map((o) => o.id);
  const pays = await db
    .select({ orderId: payment.orderId })
    .from(payment)
    .where(inArray(payment.orderId, ids));
  const hasPayment = new Set(pays.map((p) => p.orderId));
  return orders.map((o) => ({ ...o, hasPayment: hasPayment.has(o.id) }));
}

export async function getUserOrder(userId: string, orderNumber: string) {
  const rows = await db
    .select()
    .from(order)
    .where(and(eq(order.userId, userId), eq(order.orderNumber, orderNumber)))
    .limit(1);
  if (!rows[0]) return null;
  const [items, pays] = await Promise.all([
    db.select().from(orderItem).where(eq(orderItem.orderId, rows[0].id)),
    db.select().from(payment).where(eq(payment.orderId, rows[0].id)),
  ]);
  return { ...rows[0], items, payments: pays };
}

/* ---------------- Admin ---------------- */

export async function getAdminProducts(q?: string) {
  const conditions = q ? [ilike(product.name, `%${q}%`)] : [];
  const rows = await db
    .select({
      product,
      brandName: brand.name,
      image: productImageSub,
      imageCount: sql<number>`(select count(*) from product_image pi where pi.product_id = ${product.id})`.mapWith(Number),
    })
    .from(product)
    .innerJoin(brand, eq(product.brandId, brand.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(product.createdAt))
    .limit(200);
  return rows.map((r) => ({ ...r.product, brandName: r.brandName, image: r.image, imageCount: r.imageCount }));
}

export async function getAdminProduct(id: string) {
  const rows = await db.select().from(product).where(eq(product.id, id)).limit(1);
  if (!rows[0]) return null;
  const [images, brands] = await Promise.all([
    db.select().from(productImage).where(eq(productImage.productId, id)).orderBy(asc(productImage.position)),
    db.select().from(brand).orderBy(asc(brand.name)),
  ]);
  return { ...rows[0], images, brands };
}

export async function getAdminStats() {
  const [productCounts] = await db
    .select({
      active: sql<number>`count(*) filter (where ${product.status} = 'active')`.mapWith(Number),
      lowStock: sql<number>`count(*) filter (where ${product.status} = 'active' and ${product.stock} < 5)`.mapWith(Number),
    })
    .from(product);
  const [orderCounts] = await db
    .select({
      total: sql<number>`count(*)`.mapWith(Number),
      pending: sql<number>`count(*) filter (where ${order.status} = 'pending_payment')`.mapWith(Number),
      paid: sql<number>`count(*) filter (where ${order.status} <> 'pending_payment' and ${order.status} <> 'cancelled')`.mapWith(Number),
    })
    .from(order);
  const [payStats] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${payment.amount}) filter (where ${payment.status} = 'complete'), 0)`.mapWith(Number),
      pendingPayments: sql<number>`count(*) filter (where ${payment.status} in ('initiated','pending','ambiguous'))`.mapWith(Number),
    })
    .from(payment);
  return {
    activeProducts: productCounts?.active ?? 0,
    lowStock: productCounts?.lowStock ?? 0,
    totalOrders: orderCounts?.total ?? 0,
    pendingOrders: orderCounts?.pending ?? 0,
    paidOrders: orderCounts?.paid ?? 0,
    revenue: payStats?.revenue ?? 0,
    pendingPayments: payStats?.pendingPayments ?? 0,
  };
}

export async function getAdminOrders(status?: string) {
  const conditions = status && status !== "all" ? [sql`${order.status}::text = ${status}`] : [];
  const rows = await db
    .select({ order, paymentStatus: payment.status, transactionUuid: payment.transactionUuid })
    .from(order)
    .leftJoin(payment, eq(payment.orderId, order.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(order.createdAt))
    .limit(200);
  return rows.map((r) => ({ ...r.order, paymentStatus: r.paymentStatus, transactionUuid: r.transactionUuid }));
}

export async function getAdminOrder(id: string) {
  const rows = await db
    .select({ order, payment: payment })
    .from(order)
    .leftJoin(payment, eq(payment.orderId, order.id))
    .where(eq(order.id, id))
    .limit(1);
  if (!rows[0]) return null;
  const items = await db.select().from(orderItem).where(eq(orderItem.orderId, id));
  return { ...rows[0].order, payment: rows[0].payment, items };
}

export async function getAdminPayments() {
  return db
    .select({
      payment,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      orderStatus: order.status,
    })
    .from(payment)
    .innerJoin(order, eq(payment.orderId, order.id))
    .orderBy(desc(payment.createdAt))
    .limit(300);
}
