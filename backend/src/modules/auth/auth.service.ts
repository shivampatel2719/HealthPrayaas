import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { users } from "../../db/schema.js";
import { ConflictError, UnauthorizedError } from "../../lib/errors.js";
import { signAuthToken } from "../../lib/jwt.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";

function toSafeUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
}

export async function login(input: LoginInput) {
  const [user] = await db.select().from(users).where(eq(users.email, input.email));

  if (!user || !user.isActive) {
    throw new UnauthorizedError();
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new UnauthorizedError();
  }

  const accessToken = signAuthToken({
    sub: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  });

  return { accessToken, user: toSafeUser(user) };
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ? toSafeUser(user) : undefined;
}

export async function register(input: RegisterInput) {
  const [existing] = await db.select().from(users).where(eq(users.email, input.email));
  if (existing) {
    throw new ConflictError("A user with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: input.role,
    })
    .returning();

  return toSafeUser(user);
}
