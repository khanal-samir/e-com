import { db, client } from "@/db";
import { user, account } from "@/db/schema";
import { eq } from "drizzle-orm";
async function main() {
  const u = await db.select().from(user).where(eq(user.email, "smoke-e2e@test.example")).limit(1);
  console.log("user:", u.map(({ id, name, email, emailVerified }) => ({ id: id.slice(0, 10), name, email, emailVerified })));
  if (u[0]) {
    const acc = await db.select({ providerId: account.providerId, hasPassword: account.password }).from(account).where(eq(account.userId, u[0].id));
    console.log("accounts:", acc.map(a => ({ providerId: a.providerId, hasPassword: !!a.hasPassword })));
  }
  await client.end();
}
main();
