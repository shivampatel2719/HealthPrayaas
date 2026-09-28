import { z } from "zod";
import { roleValues } from "../../db/schema.js";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  role: z.enum(roleValues),
});
export type RegisterInput = z.infer<typeof registerSchema>;
