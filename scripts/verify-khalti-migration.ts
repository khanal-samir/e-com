import { db, client } from "@/db";
import { sql } from "drizzle-orm";
async function main() {
  const res = (await db.execute(sql`select column_name from information_schema.columns where table_name = 'payment' order by ordinal_position`)) as unknown;
  const rows = Array.isArray(res) ? res : (res as { rows: { column_name: string }[] }).rows;
  console.log("payment columns:", rows.map((r: { column_name: string }) => r.column_name).join(", "));
  const enums = (await db.execute(sql`select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'payment_provider' order by enumsortorder`)) as unknown;
  const erows = Array.isArray(enums) ? enums : (enums as { rows: { enumlabel: string }[] }).rows;
  console.log("payment_provider values:", erows.map((r: { enumlabel: string }) => r.enumlabel).join(", "));
  await client.end();
}
main();
