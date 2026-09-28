import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "../db/schema.js";

export type AuthTokenPayload = {
  sub: string;
  email: string;
  fullName: string;
  role: Role;
};

const EXPIRES_IN = "7d";

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}
