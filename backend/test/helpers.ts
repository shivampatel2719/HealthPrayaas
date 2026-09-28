import { db } from "../src/db/client.js";
import { users, type Role } from "../src/db/schema.js";
import { hashPassword } from "../src/lib/password.js";

export async function createTestUser(email: string, password: string, role: Role = "admin") {
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: await hashPassword(password), fullName: "Test User", role })
    .returning();
  return { user, password };
}
