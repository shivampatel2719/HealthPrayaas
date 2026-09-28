import OpenAI from 'openai';
import type { CohortMetric, HealthRecordRow, InterventionCategory, RiskFlagRow, RiskSeverity, StudentRow } from '@/db/db';

const MODEL = 'gpt-4o-mini';

function getClient(apiKey: string) {
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

type StudentContext = Pick<StudentRow, 'fullName' | 'gender'>;

function formatHealthRecordContext(student: StudentContext, record: HealthRecordRow): string {
  return [
    `Student: ${student.fullName} (${student.gender}, age ${record.ageYears})`,
    `Vitals: height ${record.heightCm}cm, weight ${record.weightKg}kg, BMI ${record.bmi}, heart rate ${record.heartRateBpm ?? 'n/a'} bpm, blood pressure ${record.bloodPressureSystolic ?? 'n/a'}/${record.bloodPressureDiastolic ?? 'n/a'}`,
    `Clinical: vision L/R ${record.visionLeftAcuity ?? 'n/a'}/${record.visionRightAcuity ?? 'n/a'}, dental hygiene ${record.dentalHygieneStatus}, hearing ${record.hearingStatus}, posture ${record.postureStatus}`,
    `Medical history: allergies [${record.knownAllergies.join(', ') || 'none'}], chronic conditions [${record.chronicConditions.join(', ') || 'none'}], medications [${record.currentMedications.join(', ') || 'none'}]`,
    `Lifestyle: average sleep ${record.avgSleepHours}h/night, physical activity ${record.physicalActivityDaysPerWeek} days/week, diet ${record.dietaryPreference}`,
  ].join('\n');
}

const INSIGHT_SYSTEM_PROMPT = `You are a pediatric health analyst for a school health tracking system. Given one checkup's data for a student, respond with ONLY a JSON object of this exact shape:
{"healthScore": <integer 0-100>, "summary": "<one or two sentence plain-language summary of this checkup>", "flags": ["<short flag label>", ...]}
healthScore reflects overall wellness for this checkup (100 = excellent, 0 = severe concern). flags is a short list of concise anomaly labels (e.g. "low_bmi", "elevated_heart_rate"); use an empty array if nothing stands out. Do not include any text outside the JSON object.`;

const RISK_SYSTEM_PROMPT = `You are a pediatric health risk-screening assistant for a school health tracking system. Given a student's checkup data, identify any health risks worth flagging for staff attention. Respond with ONLY a JSON object of this exact shape:
{"risks": [{"riskType": "<short_snake_case_label>", "severity": "low"|"medium"|"high", "rationale": "<one sentence why this is flagged, referencing the specific data point(s)>", "suggestedIntervention": "<one concrete, actionable suggestion>", "interventionCategory": "lifestyle"|"medical_consultation"}]}
Only include genuinely notable risks grounded in the provided data (e.g. correlating low sleep and low physical activity with immune vulnerability, or an abnormal vital sign). Use an empty risks array if nothing is genuinely concerning. Do not include any text outside the JSON object.`;

export type InsightResult = { healthScore: number; summary: string; flags: string[] };

export async function generateInsight(
  apiKey: string,
  student: StudentContext,
  record: HealthRecordRow,
): Promise<InsightResult> {
  const client = getClient(apiKey);
  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: INSIGHT_SYSTEM_PROMPT },
      { role: 'user', content: formatHealthRecordContext(student, record) },
    ],
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned an empty response');
  return JSON.parse(content) as InsightResult;
}

export type GeneratedRisk = Pick<
  RiskFlagRow,
  'riskType' | 'severity' | 'rationale' | 'suggestedIntervention' | 'interventionCategory'
>;

export async function generateRiskFlags(
  apiKey: string,
  student: StudentContext,
  record: HealthRecordRow,
): Promise<GeneratedRisk[]> {
  const client = getClient(apiKey);
  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: RISK_SYSTEM_PROMPT },
      { role: 'user', content: formatHealthRecordContext(student, record) },
    ],
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned an empty response');
  const parsed = JSON.parse(content) as {
    risks: { riskType: string; severity: RiskSeverity; rationale: string; suggestedIntervention: string; interventionCategory: InterventionCategory }[];
  };
  return parsed.risks;
}

export async function foldContextSummary(
  apiKey: string,
  student: StudentContext,
  previousSummary: string | null,
  record: HealthRecordRow,
): Promise<string> {
  const client = getClient(apiKey);
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content:
          "You maintain a short rolling narrative summary of a student's health history for a school health tracking system, to be used as chatbot context. Given the previous summary (if any) and the newest checkup's data, write an updated summary in 3-5 sentences. Focus on trends and notable ongoing issues, not just restating every number. Respond with ONLY the updated summary text, no preamble.",
      },
      {
        role: 'user',
        content: `Previous summary: ${previousSummary ?? '(none yet, this is the first checkup)'}\n\nNewest checkup:\n${formatHealthRecordContext(student, record)}`,
      },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() ?? previousSummary ?? '';
}

export async function generateCohortSummary(
  apiKey: string,
  metric: CohortMetric,
  avgValue: number,
  sampleSize: number,
): Promise<string> {
  const client = getClient(apiKey);
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a school health analyst. Given a cohort-level aggregate metric, write ONE short plain-language sentence summarizing it for a teacher or administrator. No JSON, just the sentence.',
      },
      {
        role: 'user',
        content: `Metric: ${metric}. Average value: ${avgValue}. Based on ${sampleSize} student(s) with a recent checkup.`,
      },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() ?? `Average ${metric}: ${avgValue}.`;
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export async function streamChatReply(
  apiKey: string,
  systemPrompt: string,
  history: ChatTurn[],
  onToken: (token: string) => void,
): Promise<string> {
  const client = getClient(apiKey);
  const stream = await client.chat.completions.create({
    model: MODEL,
    stream: true,
    messages: [{ role: 'system', content: systemPrompt }, ...history],
  });

  let fullText = '';
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content;
    if (token) {
      fullText += token;
      onToken(token);
    }
  }
  return fullText;
}
