import { z } from "zod";
import {
  dentalHygieneValues,
  dietaryPreferenceValues,
  hearingStatusValues,
  postureStatusValues,
} from "../../db/schema.js";

export const createHealthRecordSchema = z.object({
  ageYears: z.coerce.number().min(0).max(25),
  heightCm: z.coerce.number().positive().max(999.9),
  weightKg: z.coerce.number().positive().max(999.9),
  heartRateBpm: z.coerce.number().int().positive().optional(),
  bloodPressureSystolic: z.coerce.number().int().positive().optional(),
  bloodPressureDiastolic: z.coerce.number().int().positive().optional(),
  visionLeftAcuity: z.string().min(1).optional(),
  visionRightAcuity: z.string().min(1).optional(),
  dentalHygieneStatus: z.enum(dentalHygieneValues),
  hearingStatus: z.enum(hearingStatusValues),
  postureStatus: z.enum(postureStatusValues),
  knownAllergies: z.array(z.string().min(1)).default([]),
  chronicConditions: z.array(z.string().min(1)).default([]),
  currentMedications: z.array(z.string().min(1)).default([]),
  avgSleepHours: z.coerce.number().min(0).max(24),
  physicalActivityDaysPerWeek: z.coerce.number().int().min(0).max(7),
  dietaryPreference: z.enum(dietaryPreferenceValues),
});
export type CreateHealthRecordInput = z.infer<typeof createHealthRecordSchema>;

export const listHealthRecordsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  before: z.string().datetime().optional(),
});
export type ListHealthRecordsQuery = z.infer<typeof listHealthRecordsQuerySchema>;
