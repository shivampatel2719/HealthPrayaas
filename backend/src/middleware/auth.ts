import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../lib/errors.js";
import { verifyAuthToken } from "../lib/jwt.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    throw new UnauthorizedError("Missing bearer token");
  }

  try {
    const payload = verifyAuthToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
    };
    next();
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
}
