import type { Role } from "../db/schema.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        fullName: string;
        role: Role;
      };
    }
  }
}

export {};
