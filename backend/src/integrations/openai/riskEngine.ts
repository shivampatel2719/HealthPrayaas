import { z } from "zod";
import { interventionCategoryValues, riskSeverityValues, type healthRecords } from "../../db/schema.js";
import { MODEL, requireOpenAI } from "./client.js";
import { formatHealthRecordContext, RISK_SYSTEM_PROMPT } from "./promptTemplates.js";

const riskResultSchema = z.object({
  risks: z.array(
    z.object({
      riskType: z.string().min(1),
      severity: z.enum(riskSeverityValues),
      rationale: z.string().min(1),
      suggestedIntervention: z.string().min(1),
      interventionCategory: z.enum(interventionCategoryValues),
    }),
  ),
});
export type RiskResult = z.infer<typeof riskResultSchema>;

export async function generateRiskFlags(
  student: { fullName: string; gender: string },
  record: typeof healthRecords.$inferSelect,
): Promise<RiskResult["risks"]> {
  const client = requireOpenAI();
  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: RISK_SYSTEM_PROMPT },
      { role: "user", content: formatHealthRecordContext(student, record) },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }
  return riskResultSchema.parse(JSON.parse(content)).risks;
}
