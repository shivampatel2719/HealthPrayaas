import { db, type DentalHygieneStatus, type DietaryPreference, type HealthRecordRow, type HearingStatus, type PostureStatus } from '@/db/db';
import { ensureInsightForRecord, refreshRiskFlags } from '@/db/analytics';
import { updateContextSummaryForRecord } from '@/db/chat';

export type CreateHealthRecordInput = {
  ageYears: number;
  heightCm: number;
  weightKg: number;
  heartRateBpm?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  visionLeftAcuity?: string;
  visionRightAcuity?: string;
  dentalHygieneStatus: DentalHygieneStatus;
  hearingStatus: HearingStatus;
  postureStatus: PostureStatus;
  knownAllergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  avgSleepHours: number;
  physicalActivityDaysPerWeek: number;
  dietaryPreference: DietaryPreference;
};

// apiKey may be null: the record still saves, but the AI enrichment (insight, risk
// flags, rolling context summary) silently no-ops until a key is configured.
export async function createHealthRecord(
  studentId: string,
  apiKey: string | null,
  input: CreateHealthRecordInput,
): Promise<HealthRecordRow> {
  const row: HealthRecordRow = {
    id: crypto.randomUUID(),
    studentId,
    recordedAt: new Date().toISOString(),
    bmi: Math.round((input.weightKg / (input.heightCm / 100) ** 2) * 100) / 100,
    ...input,
  };
  await db.healthRecords.add(row);

  if (apiKey) {
    ensureInsightForRecord(apiKey, row).catch((error) => console.error('Failed to generate insight', error));
    refreshRiskFlags(studentId, apiKey).catch((error) => console.error('Failed to refresh risk flags', error));
    updateContextSummaryForRecord(apiKey, row).catch((error) => console.error('Failed to update context summary', error));
  }

  return row;
}

export async function listHealthRecords(studentId: string): Promise<HealthRecordRow[]> {
  const rows = await db.healthRecords.where('studentId').equals(studentId).toArray();
  return rows.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}
