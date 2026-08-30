import { db, client } from "@/db";
import { sql } from "drizzle-orm";
async function main() {
  const res = (await db.execute(sql`select tablename from pg_tables where schemaname = 'public' order by tablename`)) as unknown;
  const rows = Array.isArray(res) ? res : (res as { rows: { tablename: string }[] }).rows;
  console.log("tables:", rows.map((t: { tablename: string }) => t.tablename).join(", "));
  await client.end();
}
main();
