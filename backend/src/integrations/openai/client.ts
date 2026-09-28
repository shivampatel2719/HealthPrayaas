import OpenAI from "openai";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";

export const MODEL = "gpt-4o-mini";

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

export function requireOpenAI(): OpenAI {
  if (!openai) {
    throw new AppError(503, "OPENAI_API_KEY is not configured. Add it to backend/.env to enable AI features.");
  }
  return openai;
}
