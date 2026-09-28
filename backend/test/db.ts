import { sql } from "drizzle-orm";
import { db } from "../src/db/client.js";

export async function resetDatabase() {
  await db.execute(sql`
    TRUNCATE TABLE
      chat_messages, chat_conversations, student_context_summaries,
      cohort_insights, risk_flags, ai_insights, health_records,
      students, sections, classes, users
    RESTART IDENTITY CASCADE
  `);
}
