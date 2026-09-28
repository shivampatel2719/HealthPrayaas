import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  // Optional so the rest of the app runs without it; AI-dependent endpoints throw a
  // clear error at call time (see integrations/openai/client.ts) until it's set.
  OPENAI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
