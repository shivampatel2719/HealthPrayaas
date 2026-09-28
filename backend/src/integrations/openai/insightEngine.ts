import { z } from "zod";
import type { healthRecords } from "../../db/schema.js";
import { MODEL, requireOpenAI } from "./client.js";
import { formatHealthRecordContext, INSIGHT_SYSTEM_PROMPT } from "./promptTemplates.js";

const insightResultSchema = z.object({
  healthScore: z.number().int().min(0).max(100),
  summary: z.string().min(1),
  flags: z.array(z.string()),
});
export type InsightResult = z.infer<typeof insightResultSchema>;

export async function generateInsight(
  student: { fullName: string; gender: string },
  record: typeof healthRecords.$inferSelect,
): Promise<InsightResult> {
  const client = requireOpenAI();
  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: INSIGHT_SYSTEM_PROMPT },
      { role: "user", content: formatHealthRecordContext(student, record) },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }
  return insightResultSchema.parse(JSON.parse(content));
}
