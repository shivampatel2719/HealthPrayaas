import { and, asc, desc, eq, lt } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  chatConversations,
  chatMessages,
  healthRecords,
  riskFlags,
  studentContextSummaries,
  students,
  type ChatMessageRole,
} from "../../db/schema.js";
import { foldRecordIntoSummary } from "../../integrations/openai/contextSummaryEngine.js";
import { MODEL, requireOpenAI } from "../../integrations/openai/client.js";
import { formatHealthRecordContext } from "../../integrations/openai/promptTemplates.js";
import { NotFoundError } from "../../lib/errors.js";

const RECENT_RAW_RECORDS = 3;
const MESSAGE_WINDOW = 20;

export async function getOrCreateConversation(studentId: string, userId: string) {
  const [existing] = await db
    .select()
    .from(chatConversations)
    .where(and(eq(chatConversations.studentId, studentId), eq(chatConversations.userId, userId)));
  if (existing) {
    return existing;
  }

  const [created] = await db.insert(chatConversations).values({ studentId, userId }).returning();
  return created;
}

export function listMessages(conversationId: string, before?: Date) {
  const conditions = [eq(chatMessages.conversationId, conversationId)];
  if (before) {
    conditions.push(lt(chatMessages.createdAt, before));
  }
  return db
    .select()
    .from(chatMessages)
    .where(and(...conditions))
    .orderBy(asc(chatMessages.createdAt));
}

async function buildSystemPrompt(studentId: string): Promise<string> {
  const [student] = await db.select().from(students).where(eq(students.id, studentId));
  if (!student) {
    throw new NotFoundError("Student not found");
  }

  const [contextSummary] = await db
    .select()
    .from(studentContextSummaries)
    .where(eq(studentContextSummaries.studentId, studentId));

  const recentRecords = await db
    .select()
    .from(healthRecords)
    .where(eq(healthRecords.studentId, studentId))
    .orderBy(desc(healthRecords.recordedAt))
    .limit(RECENT_RAW_RECORDS);

  const openFlags = await db
    .select()
    .from(riskFlags)
    .where(and(eq(riskFlags.studentId, studentId), eq(riskFlags.status, "open")));

  const lines = [
    "You are a helpful assistant for teachers and health staff at a school, answering questions about a specific student's health data. Be concise and factual, and only use the information provided below. If asked something not covered by this data, say you don't have that information.",
    "",
    `Student: ${student.fullName}, ${student.gender}, date of birth ${student.dateOfBirth}.`,
  ];

  if (contextSummary) {
    lines.push("", `Health history summary: ${contextSummary.summaryText}`);
  }

  if (recentRecords.length > 0) {
    lines.push("", "Most recent checkup(s):");
    for (const record of recentRecords) {
      lines.push(formatHealthRecordContext({ fullName: student.fullName, gender: student.gender }, record));
    }
  }

  if (openFlags.length > 0) {
    lines.push("", "Open risk flags:");
    for (const flag of openFlags) {
      lines.push(
        `- ${flag.riskType} (${flag.severity}): ${flag.rationale}. Suggested: ${flag.suggestedIntervention}`,
      );
    }
  }

  return lines.join("\n");
}

export async function streamChatReply(
  studentId: string,
  conversationId: string,
  userMessage: string,
  onToken: (token: string) => void,
): Promise<string> {
  await db.insert(chatMessages).values({ conversationId, role: "user", content: userMessage });

  const systemPrompt = await buildSystemPrompt(studentId);

  // Sliding window: only the most recent messages are sent verbatim, keeping the
  // prompt bounded regardless of how long the conversation gets.
  const priorMessages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, conversationId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(MESSAGE_WINDOW);

  const history = priorMessages
    .reverse()
    .map((message) => ({ role: message.role as ChatMessageRole, content: message.content }));

  const client = requireOpenAI();
  const stream = await client.chat.completions.create({
    model: MODEL,
    stream: true,
    messages: [{ role: "system", content: systemPrompt }, ...history],
  });

  let fullText = "";
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content;
    if (token) {
      fullText += token;
      onToken(token);
    }
  }

  await db.insert(chatMessages).values({ conversationId, role: "assistant", content: fullText });
  await db
    .update(chatConversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(chatConversations.id, conversationId));

  return fullText;
}

export async function updateContextSummaryForRecord(record: typeof healthRecords.$inferSelect) {
  const [student] = await db.select().from(students).where(eq(students.id, record.studentId));
  if (!student) {
    return;
  }

  const [existing] = await db
    .select()
    .from(studentContextSummaries)
    .where(eq(studentContextSummaries.studentId, record.studentId));

  const updatedSummary = await foldRecordIntoSummary(
    { fullName: student.fullName, gender: student.gender },
    existing?.summaryText ?? null,
    record,
  );

  await db
    .insert(studentContextSummaries)
    .values({ studentId: record.studentId, summaryText: updatedSummary, basedOnRecordId: record.id })
    .onConflictDoUpdate({
      target: studentContextSummaries.studentId,
      set: { summaryText: updatedSummary, basedOnRecordId: record.id, updatedAt: new Date() },
    });
}

