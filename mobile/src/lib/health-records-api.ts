import { apiRequest } from '@/lib/api-client';

export type DentalHygieneStatus = 'good' | 'fair' | 'poor';
export type HearingStatus = 'normal' | 'impaired';
export type PostureStatus = 'normal' | 'mild_issue' | 'significant_issue';
export type DietaryPreference = 'vegetarian' | 'non_vegetarian' | 'vegan' | 'eggetarian' | 'other';

export type HealthRecordDto = {
  id: string;
  studentId: string;
  recordedBy: string;
  recordedAt: string;
  ageYears: string;
  heightCm: string;
  weightKg: string;
  bmi: string;
  heartRateBpm: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  visionLeftAcuity: string | null;
  visionRightAcuity: string | null;
  dentalHygieneStatus: DentalHygieneStatus;
  hearingStatus: HearingStatus;
  postureStatus: PostureStatus;
  knownAllergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  avgSleepHours: string;
  physicalActivityDaysPerWeek: number;
  dietaryPreference: DietaryPreference;
  createdAt: string;
};

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

export function createHealthRecord(token: string, studentId: string, input: CreateHealthRecordInput) {
  return apiRequest<HealthRecordDto>(`/api/students/${studentId}/health-records`, {
    method: 'POST',
    token,
    body: input,
  });
}

export function listHealthRecords(token: string, studentId: string) {
  return apiRequest<HealthRecordDto[]>(`/api/students/${studentId}/health-records`, { token });
}
