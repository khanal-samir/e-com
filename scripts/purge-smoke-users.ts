import { eq, like } from "drizzle-orm";
import { db, client } from "@/db";
import { account, session, user } from "@/db/schema";
async function main() {
  const rows = await db.select({ id: user.id }).from(user).where(like(user.email, "smoke-e2e%@test.example"));
  for (const u of rows) {
    await db.delete(session).where(eq(session.userId, u.id));
    await db.delete(account).where(eq(account.userId, u.id));
    await db.delete(user).where(eq(user.id, u.id));
  }
  console.log(`purged ${rows.length} smoke users`);
  await client.end();
}
main();
