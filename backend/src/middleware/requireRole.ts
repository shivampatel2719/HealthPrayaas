import type { NextFunction, Request, Response } from "express";
import type { Role } from "../db/schema.js";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError();
    }
    next();
  };
}
