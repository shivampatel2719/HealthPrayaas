import type { healthRecords } from "../../db/schema.js";
import { MODEL, requireOpenAI } from "./client.js";
import { formatHealthRecordContext } from "./promptTemplates.js";

export async function foldRecordIntoSummary(
  student: { fullName: string; gender: string },
  previousSummary: string | null,
  record: typeof healthRecords.$inferSelect,
): Promise<string> {
  const client = requireOpenAI();
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You maintain a short rolling narrative summary of a student's health history for a school health tracking system, to be used as chatbot context. Given the previous summary (if any) and the newest checkup's data, write an updated summary in 3-5 sentences. Focus on trends and notable ongoing issues, not just restating every number. Respond with ONLY the updated summary text, no preamble.",
      },
      {
        role: "user",
        content: `Previous summary: ${previousSummary ?? "(none yet, this is the first checkup)"}\n\nNewest checkup:\n${formatHealthRecordContext(student, record)}`,
      },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() ?? previousSummary ?? "";
}
