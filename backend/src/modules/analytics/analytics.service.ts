import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  aiInsights,
  cohortInsights,
  healthRecords,
  riskFlags,
  students,
  type CohortMetric,
  type RiskFlagStatus,
} from "../../db/schema.js";
import { generateInsight } from "../../integrations/openai/insightEngine.js";
import { generateRiskFlags } from "../../integrations/openai/riskEngine.js";
import { MODEL, requireOpenAI } from "../../integrations/openai/client.js";
import { NotFoundError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";

const HEATMAP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function getStudentOrThrow(studentId: string) {
  const [student] = await db.select().from(students).where(eq(students.id, studentId));
  if (!student) {
    throw new NotFoundError("Student not found");
  }
  return student;
}

// Cache-or-generate: a screen view checks ai_insights first and only calls OpenAI when
// no row exists yet for this health_record_id.
export async function ensureInsightForRecord(record: typeof healthRecords.$inferSelect) {
  const [existing] = await db.select().from(aiInsights).where(eq(aiInsights.healthRecordId, record.id));
  if (existing) {
    return existing;
  }

  const student = await getStudentOrThrow(record.studentId);
  const result = await generateInsight({ fullName: student.fullName, gender: student.gender }, record);

  const [created] = await db
    .insert(aiInsights)
    .values({
      healthRecordId: record.id,
      studentId: record.studentId,
      healthScore: result.healthScore,
      summary: result.summary,
      flags: result.flags,
      model: MODEL,
    })
    .returning();
  return created;
}

export async function getGrowthCurve(studentId: string) {
  await getStudentOrThrow(studentId);

  const records = await db
    .select()
    .from(healthRecords)
    .where(eq(healthRecords.studentId, studentId))
    .orderBy(healthRecords.recordedAt);

  const insights = await db.select().from(aiInsights).where(eq(aiInsights.studentId, studentId));
  const insightByRecordId = new Map(insights.map((insight) => [insight.healthRecordId, insight]));

  return records.map((record) => ({
    record,
    insight: insightByRecordId.get(record.id) ?? null,
  }));
}

export function listRiskFlags(studentId: string) {
  return db
    .select()
    .from(riskFlags)
    .where(and(eq(riskFlags.studentId, studentId), eq(riskFlags.status, "open")))
    .orderBy(desc(riskFlags.createdAt));
}

// No-ops (skips the OpenAI call) if the student's latest record already has flags
// generated from it, so repeated refreshes don't re-call the API for the same data.
export async function refreshRiskFlags(studentId: string) {
  const student = await getStudentOrThrow(studentId);
  const [latestRecord] = await db
    .select()
    .from(healthRecords)
    .where(eq(healthRecords.studentId, studentId))
    .orderBy(desc(healthRecords.recordedAt))
    .limit(1);

  if (!latestRecord) {
    return [];
  }

  const [existingForRecord] = await db
    .select()
    .from(riskFlags)
    .where(eq(riskFlags.sourceRecordId, latestRecord.id))
    .limit(1);

  if (existingForRecord) {
    return listRiskFlags(studentId);
  }

  const risks = await generateRiskFlags({ fullName: student.fullName, gender: student.gender }, latestRecord);

  if (risks.length > 0) {
    await db.insert(riskFlags).values(
      risks.map((risk) => ({
        studentId,
        sourceRecordId: latestRecord.id,
        riskType: risk.riskType,
        severity: risk.severity,
        rationale: risk.rationale,
        suggestedIntervention: risk.suggestedIntervention,
        interventionCategory: risk.interventionCategory,
      })),
    );
  }

  return listRiskFlags(studentId);
}

export async function setRiskFlagStatus(flagId: string, status: RiskFlagStatus, resolvedBy: string) {
  const [updated] = await db
    .update(riskFlags)
    .set({
      status,
      resolvedAt: status === "resolved" ? new Date() : null,
      resolvedBy: status === "resolved" ? resolvedBy : null,
    })
    .where(eq(riskFlags.id, flagId))
    .returning();
  if (!updated) {
    throw new NotFoundError("Risk flag not found");
  }
  return updated;
}

async function computeSectionMetric(
  sectionId: string,
  metric: CohortMetric,
): Promise<{ avgValue: number; sampleSize: number }> {
  const latestPerStudent = sql`
    SELECT DISTINCT ON (hr.student_id) hr.*
    FROM health_records hr
    INNER JOIN students s ON s.id = hr.student_id
    WHERE s.section_id = ${sectionId} AND s.is_active = true
    ORDER BY hr.student_id, hr.recorded_at DESC
  `;

  let query;
  if (metric === "bmi") {
    query = sql`
      WITH latest AS (${latestPerStudent})
      SELECT AVG(bmi)::numeric(6,2) AS avg_value, COUNT(*) AS sample_size FROM latest
    `;
  } else if (metric === "overall") {
    query = sql`
      WITH latest AS (${latestPerStudent})
      SELECT AVG(ai.health_score)::numeric(6,2) AS avg_value, COUNT(ai.health_score) AS sample_size
      FROM latest
      LEFT JOIN ai_insights ai ON ai.health_record_id = latest.id
    `;
  } else {
    query = sql`
      WITH latest AS (${latestPerStudent})
      SELECT
        (AVG(
          CASE WHEN posture_status <> 'normal'
            OR hearing_status <> 'normal'
            OR dental_hygiene_status = 'poor'
            OR array_length(chronic_conditions, 1) > 0
          THEN 1 ELSE 0 END
        ) * 100)::numeric(6,2) AS avg_value,
        COUNT(*) AS sample_size
      FROM latest
    `;
  }

  const result = await db.execute<{ avg_value: string | null; sample_size: string }>(query);
  const row = result.rows[0];
  return {
    avgValue: row?.avg_value ? Number(row.avg_value) : 0,
    sampleSize: Number(row?.sample_size ?? 0),
  };
}

async function generateCohortSummary(metric: CohortMetric, avgValue: number, sampleSize: number): Promise<string> {
  const client = requireOpenAI();
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a school health analyst. Given a cohort-level aggregate metric, write ONE short plain-language sentence summarizing it for a teacher or administrator. No JSON, just the sentence.",
      },
      {
        role: "user",
        content: `Metric: ${metric}. Average value: ${avgValue}. Based on ${sampleSize} student(s) with a recent checkup.`,
      },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() ?? `Average ${metric}: ${avgValue}.`;
}

export async function getHeatmap(sectionId: string, metric: CohortMetric) {
  const { avgValue, sampleSize } = await computeSectionMetric(sectionId, metric);
  const today = new Date().toISOString().slice(0, 10);

  const [cached] = await db
    .select()
    .from(cohortInsights)
    .where(
      and(
        eq(cohortInsights.sectionId, sectionId),
        eq(cohortInsights.metric, metric),
        eq(cohortInsights.periodStart, today),
        eq(cohortInsights.periodEnd, today),
      ),
    );

  const isFresh = cached && Date.now() - cached.generatedAt.getTime() < HEATMAP_CACHE_TTL_MS;
  if (isFresh) {
    return { metric, avgValue, sampleSize, aiSummary: cached.aiSummary, generatedAt: cached.generatedAt };
  }

  let aiSummary = `Average ${metric} for this section is ${avgValue} (${sampleSize} student(s) with recent data).`;
  if (sampleSize > 0) {
    try {
      aiSummary = await generateCohortSummary(metric, avgValue, sampleSize);
    } catch (error) {
      logger.error(error, "Failed to generate cohort AI summary, using fallback");
    }
  }

  const [upserted] = await db
    .insert(cohortInsights)
    .values({ sectionId, metric, periodStart: today, periodEnd: today, avgValue: String(avgValue), aiSummary })
    .onConflictDoUpdate({
      target: [cohortInsights.sectionId, cohortInsights.metric, cohortInsights.periodStart, cohortInsights.periodEnd],
      set: { avgValue: String(avgValue), aiSummary, generatedAt: new Date() },
    })
    .returning();

  return { metric, avgValue, sampleSize, aiSummary: upserted.aiSummary, generatedAt: upserted.generatedAt };
}
