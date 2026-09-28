import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "../../db/client.js";
import { healthRecords } from "../../db/schema.js";
import { ensureInsightForRecord, refreshRiskFlags } from "../analytics/analytics.service.js";
import { updateContextSummaryForRecord } from "../chat/chat.service.js";
import { NotFoundError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import type { CreateHealthRecordInput, ListHealthRecordsQuery } from "./health-records.schema.js";

export async function createHealthRecord(
  studentId: string,
  recordedBy: string,
  input: CreateHealthRecordInput,
) {
  const [created] = await db
    .insert(healthRecords)
    .values({
      studentId,
      recordedBy,
      ageYears: String(input.ageYears),
      heightCm: String(input.heightCm),
      weightKg: String(input.weightKg),
      heartRateBpm: input.heartRateBpm,
      bloodPressureSystolic: input.bloodPressureSystolic,
      bloodPressureDiastolic: input.bloodPressureDiastolic,
      visionLeftAcuity: input.visionLeftAcuity,
      visionRightAcuity: input.visionRightAcuity,
      dentalHygieneStatus: input.dentalHygieneStatus,
      hearingStatus: input.hearingStatus,
      postureStatus: input.postureStatus,
      knownAllergies: input.knownAllergies,
      chronicConditions: input.chronicConditions,
      currentMedications: input.currentMedications,
      avgSleepHours: String(input.avgSleepHours),
      physicalActivityDaysPerWeek: input.physicalActivityDaysPerWeek,
      dietaryPreference: input.dietaryPreference,
    })
    .returning();

  // Fire-and-forget: warms the ai_insights/risk_flags caches so they're usually ready
  // by the time a teacher opens the student's screen, without blocking this response.
  ensureInsightForRecord(created).catch((error) => logger.error(error, "Failed to generate insight for record"));
  refreshRiskFlags(studentId).catch((error) => logger.error(error, "Failed to refresh risk flags"));
  updateContextSummaryForRecord(created).catch((error) => logger.error(error, "Failed to update context summary"));

  return created;
}

export function listHealthRecordsForStudent(studentId: string, query: ListHealthRecordsQuery) {
  const conditions = [eq(healthRecords.studentId, studentId)];
  if (query.before) {
    conditions.push(lt(healthRecords.recordedAt, new Date(query.before)));
  }

  return db
    .select()
    .from(healthRecords)
    .where(and(...conditions))
    .orderBy(desc(healthRecords.recordedAt))
    .limit(query.limit);
}

export async function getHealthRecord(recordId: string) {
  const [record] = await db.select().from(healthRecords).where(eq(healthRecords.id, recordId));
  if (!record) {
    throw new NotFoundError("Health record not found");
  }
  return record;
}
