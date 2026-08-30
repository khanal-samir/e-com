import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// ponytail: single global client; Neon handles pooling via the pooler URL
const globalForDb = globalThis as unknown as { conn?: postgres.Sql };

export const client =
  globalForDb.conn ??
  postgres(process.env.DATABASE_URL ?? "postgres://localhost:5432/ss_tech_placeholder", {
    max: 10,
    ssl: process.env.DATABASE_URL?.includes("localhost") ? false : "require",
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalForDb.conn = client;

export const db = drizzle(client, { schema });
