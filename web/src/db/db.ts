import Dexie, { type EntityTable } from 'dexie';

export type Gender = 'male' | 'female' | 'other';
export type DentalHygieneStatus = 'good' | 'fair' | 'poor';
export type HearingStatus = 'normal' | 'impaired';
export type PostureStatus = 'normal' | 'mild_issue' | 'significant_issue';
export type DietaryPreference = 'vegetarian' | 'non_vegetarian' | 'vegan' | 'eggetarian' | 'other';
export type RiskSeverity = 'low' | 'medium' | 'high';
export type InterventionCategory = 'lifestyle' | 'medical_consultation';
export type RiskFlagStatus = 'open' | 'acknowledged' | 'resolved';
export type CohortMetric = 'bmi' | 'illness_rate' | 'overall';
export type ChatRole = 'user' | 'assistant';

export interface ClassRow {
  id: string;
  name: string;
  gradeLevel: number;
  createdAt: string;
}

export interface SectionRow {
  id: string;
  classId: string;
  name: string;
  createdAt: string;
}

export interface StudentRow {
  id: string;
  sectionId: string;
  rollNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
  isActive: boolean;
  createdAt: string;
}

// One row = one wizard submission = one checkup event, append-only (mirrors the
// original backend design: corrections are new rows, not updates).
export interface HealthRecordRow {
  id: string;
  studentId: string;
  recordedAt: string;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  bmi: number;
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
}

export interface AiInsightRow {
  id: string;
  healthRecordId: string;
  studentId: string;
  healthScore: number;
  summary: string;
  flags: string[];
  generatedAt: string;
}

export interface RiskFlagRow {
  id: string;
  studentId: string;
  sourceRecordId: string;
  riskType: string;
  severity: RiskSeverity;
  rationale: string;
  suggestedIntervention: string;
  interventionCategory: InterventionCategory;
  status: RiskFlagStatus;
  createdAt: string;
  resolvedAt?: string;
}

export interface CohortInsightRow {
  id: string;
  sectionId: string;
  metric: CohortMetric;
  avgValue: number;
  aiSummary: string;
  generatedAt: string;
}

export interface ContextSummaryRow {
  studentId: string;
  summaryText: string;
  updatedAt: string;
}

export interface ChatMessageRow {
  id: string;
  studentId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

class HealthPrayaasDB extends Dexie {
  classes!: EntityTable<ClassRow, 'id'>;
  sections!: EntityTable<SectionRow, 'id'>;
  students!: EntityTable<StudentRow, 'id'>;
  healthRecords!: EntityTable<HealthRecordRow, 'id'>;
  aiInsights!: EntityTable<AiInsightRow, 'id'>;
  riskFlags!: EntityTable<RiskFlagRow, 'id'>;
  cohortInsights!: EntityTable<CohortInsightRow, 'id'>;
  contextSummaries!: EntityTable<ContextSummaryRow, 'studentId'>;
  chatMessages!: EntityTable<ChatMessageRow, 'id'>;

  constructor() {
    super('healthprayaas');
    this.version(1).stores({
      classes: 'id, gradeLevel',
      sections: 'id, classId',
      students: 'id, sectionId, isActive',
      healthRecords: 'id, studentId, recordedAt',
      aiInsights: 'id, healthRecordId, studentId',
      riskFlags: 'id, studentId, status',
      cohortInsights: 'id, sectionId, metric',
      contextSummaries: 'studentId',
      chatMessages: 'id, studentId, createdAt',
    });
  }
}

export const db = new HealthPrayaasDB();
