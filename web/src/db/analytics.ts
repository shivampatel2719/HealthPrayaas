import { db, type AiInsightRow, type CohortMetric, type HealthRecordRow, type RiskFlagRow, type RiskFlagStatus } from '@/db/db';
import { generateCohortSummary, generateInsight, generateRiskFlags } from '@/lib/openai';
import { getStudent, listStudentsBySection } from '@/db/academic';

const HEATMAP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Cache-or-generate: only calls OpenAI the first time a given checkup is seen.
export async function ensureInsightForRecord(apiKey: string, record: HealthRecordRow): Promise<AiInsightRow | undefined> {
  const existing = await db.aiInsights.where('healthRecordId').equals(record.id).first();
  if (existing) return existing;

  const student = await getStudent(record.studentId);
  if (!student) return undefined;

  const result = await generateInsight(apiKey, student, record);
  const row: AiInsightRow = {
    id: crypto.randomUUID(),
    healthRecordId: record.id,
    studentId: record.studentId,
    healthScore: result.healthScore,
    summary: result.summary,
    flags: result.flags,
    generatedAt: new Date().toISOString(),
  };
  await db.aiInsights.add(row);
  return row;
}

export async function getGrowthCurve(studentId: string) {
  const records = (await db.healthRecords.where('studentId').equals(studentId).toArray()).sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt),
  );
  const insights = await db.aiInsights.where('studentId').equals(studentId).toArray();
  const insightByRecordId = new Map(insights.map((insight) => [insight.healthRecordId, insight]));

  return records.map((record) => ({ record, insight: insightByRecordId.get(record.id) ?? null }));
}

export async function listRiskFlags(studentId: string): Promise<RiskFlagRow[]> {
  const rows = await db.riskFlags.where('studentId').equals(studentId).toArray();
  return rows.filter((row) => row.status === 'open').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// No-ops (skips the OpenAI call) if the student's latest record already has flags
// generated from it, so repeated refreshes don't re-call the API for the same data.
export async function refreshRiskFlags(studentId: string, apiKey: string): Promise<RiskFlagRow[]> {
  const student = await getStudent(studentId);
  if (!student) return [];

  const records = (await db.healthRecords.where('studentId').equals(studentId).toArray()).sort((a, b) =>
    b.recordedAt.localeCompare(a.recordedAt),
  );
  const latestRecord = records[0];
  if (!latestRecord) return [];

  const existingForRecord = await db.riskFlags.where('sourceRecordId').equals(latestRecord.id).first();
  if (existingForRecord) return listRiskFlags(studentId);

  const risks = await generateRiskFlags(apiKey, student, latestRecord);
  if (risks.length > 0) {
    await db.riskFlags.bulkAdd(
      risks.map((risk) => ({
        id: crypto.randomUUID(),
        studentId,
        sourceRecordId: latestRecord.id,
        status: 'open' as const,
        createdAt: new Date().toISOString(),
        ...risk,
      })),
    );
  }
  return listRiskFlags(studentId);
}

export async function setRiskFlagStatus(flagId: string, status: RiskFlagStatus): Promise<void> {
  await db.riskFlags.update(flagId, {
    status,
    resolvedAt: status === 'resolved' ? new Date().toISOString() : undefined,
  });
}

async function computeSectionMetric(sectionId: string, metric: CohortMetric): Promise<{ avgValue: number; sampleSize: number }> {
  const students = await listStudentsBySection(sectionId);
  const latestRecords = await Promise.all(
    students.map(async (student) => {
      const records = await db.healthRecords.where('studentId').equals(student.id).toArray();
      records.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
      return records[0];
    }),
  );
  const withRecords = latestRecords.filter((record): record is HealthRecordRow => Boolean(record));

  if (metric === 'bmi') {
    if (withRecords.length === 0) return { avgValue: 0, sampleSize: 0 };
    const avg = withRecords.reduce((sum, record) => sum + record.bmi, 0) / withRecords.length;
    return { avgValue: Math.round(avg * 100) / 100, sampleSize: withRecords.length };
  }

  if (metric === 'overall') {
    const scores = await Promise.all(
      withRecords.map(async (record) => (await db.aiInsights.where('healthRecordId').equals(record.id).first())?.healthScore),
    );
    const known = scores.filter((score): score is number => typeof score === 'number');
    if (known.length === 0) return { avgValue: 0, sampleSize: 0 };
    const avg = known.reduce((sum, score) => sum + score, 0) / known.length;
    return { avgValue: Math.round(avg * 100) / 100, sampleSize: known.length };
  }

  // illness_rate: fraction of students whose latest checkup shows a flagged issue
  if (withRecords.length === 0) return { avgValue: 0, sampleSize: 0 };
  const flagged = withRecords.filter(
    (record) =>
      record.postureStatus !== 'normal' ||
      record.hearingStatus !== 'normal' ||
      record.dentalHygieneStatus === 'poor' ||
      record.chronicConditions.length > 0,
  );
  return { avgValue: Math.round((flagged.length / withRecords.length) * 10000) / 100, sampleSize: withRecords.length };
}

export async function getHeatmap(sectionId: string, metric: CohortMetric, apiKey: string | null) {
  const { avgValue, sampleSize } = await computeSectionMetric(sectionId, metric);

  const sectionCohortRows = await db.cohortInsights.where('sectionId').equals(sectionId).toArray();
  const cached = sectionCohortRows.find((row) => row.metric === metric);
  const isFresh = cached && Date.now() - new Date(cached.generatedAt).getTime() < HEATMAP_CACHE_TTL_MS;
  if (isFresh) {
    return { metric, avgValue, sampleSize, aiSummary: cached.aiSummary };
  }

  let aiSummary = `Average ${metric} for this section is ${avgValue} (${sampleSize} student(s) with recent data).`;
  if (sampleSize > 0 && apiKey) {
    try {
      aiSummary = await generateCohortSummary(apiKey, metric, avgValue, sampleSize);
    } catch (error) {
      console.error('Failed to generate cohort AI summary, using fallback', error);
    }
  }

  const row = {
    id: cached?.id ?? crypto.randomUUID(),
    sectionId,
    metric,
    avgValue,
    aiSummary,
    generatedAt: new Date().toISOString(),
  };
  await db.cohortInsights.put(row);

  return { metric, avgValue, sampleSize, aiSummary };
}
