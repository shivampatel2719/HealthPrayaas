import { db, type ChatMessageRow, type HealthRecordRow } from '@/db/db';
import { getStudent } from '@/db/academic';
import { foldContextSummary, streamChatReply, type ChatTurn } from '@/lib/openai';

const RECENT_RAW_RECORDS = 3;
const MESSAGE_WINDOW = 20;

export async function listMessages(studentId: string): Promise<ChatMessageRow[]> {
  const rows = await db.chatMessages.where('studentId').equals(studentId).toArray();
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function buildSystemPrompt(studentId: string): Promise<string> {
  const student = await getStudent(studentId);
  if (!student) throw new Error('Student not found');

  const contextSummary = await db.contextSummaries.get(studentId);

  const records = (await db.healthRecords.where('studentId').equals(studentId).toArray())
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    .slice(0, RECENT_RAW_RECORDS);

  const openFlags = (await db.riskFlags.where('studentId').equals(studentId).toArray()).filter(
    (flag) => flag.status === 'open',
  );

  const lines = [
    "You are a helpful assistant for teachers and health staff at a school, answering questions about a specific student's health data. Be concise and factual, and only use the information provided below. If asked something not covered by this data, say you don't have that information.",
    '',
    `Student: ${student.fullName}, ${student.gender}, date of birth ${student.dateOfBirth}.`,
  ];

  if (contextSummary) {
    lines.push('', `Health history summary: ${contextSummary.summaryText}`);
  }

  if (records.length > 0) {
    lines.push('', 'Most recent checkup(s):');
    for (const record of records) {
      lines.push(
        `Height ${record.heightCm}cm, weight ${record.weightKg}kg, BMI ${record.bmi}, sleep ${record.avgSleepHours}h, activity ${record.physicalActivityDaysPerWeek} days/week, allergies [${record.knownAllergies.join(', ') || 'none'}], chronic conditions [${record.chronicConditions.join(', ') || 'none'}].`,
      );
    }
  }

  if (openFlags.length > 0) {
    lines.push('', 'Open risk flags:');
    for (const flag of openFlags) {
      lines.push(`- ${flag.riskType} (${flag.severity}): ${flag.rationale}. Suggested: ${flag.suggestedIntervention}`);
    }
  }

  return lines.join('\n');
}

export async function sendMessage(
  studentId: string,
  apiKey: string,
  content: string,
  onToken: (token: string) => void,
): Promise<string> {
  await db.chatMessages.add({
    id: crypto.randomUUID(),
    studentId,
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
  });

  const systemPrompt = await buildSystemPrompt(studentId);

  const priorMessages = (await listMessages(studentId)).slice(-MESSAGE_WINDOW);
  const history: ChatTurn[] = priorMessages.map((message) => ({ role: message.role, content: message.content }));

  const fullText = await streamChatReply(apiKey, systemPrompt, history, onToken);

  await db.chatMessages.add({
    id: crypto.randomUUID(),
    studentId,
    role: 'assistant',
    content: fullText,
    createdAt: new Date().toISOString(),
  });

  return fullText;
}

export async function updateContextSummaryForRecord(apiKey: string, record: HealthRecordRow): Promise<void> {
  const student = await getStudent(record.studentId);
  if (!student) return;

  const existing = await db.contextSummaries.get(record.studentId);
  const updatedSummary = await foldContextSummary(apiKey, student, existing?.summaryText ?? null, record);

  await db.contextSummaries.put({
    studentId: record.studentId,
    summaryText: updatedSummary,
    updatedAt: new Date().toISOString(),
  });
}
