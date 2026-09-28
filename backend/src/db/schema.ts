import { sql } from 'drizzle-orm';
import { boolean, date, index, integer, jsonb, numeric, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export const roleValues = ['admin', 'teacher', 'health_staff'] as const;
export type Role = (typeof roleValues)[number];

export const genderValues = ['male', 'female', 'other'] as const;
export type Gender = (typeof genderValues)[number];

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role', { enum: roleValues }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const classes = pgTable('classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  gradeLevel: integer('grade_level').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sections = pgTable(
  'sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.classId, table.name)],
);

export const students = pgTable(
  'students',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sectionId: uuid('section_id')
      .notNull()
      .references(() => sections.id),
    rollNumber: text('roll_number').notNull(),
    fullName: text('full_name').notNull(),
    dateOfBirth: date('date_of_birth').notNull(),
    gender: text('gender', { enum: genderValues }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.sectionId, table.rollNumber)],
);

export const dentalHygieneValues = ['good', 'fair', 'poor'] as const;
export const hearingStatusValues = ['normal', 'impaired'] as const;
export const postureStatusValues = ['normal', 'mild_issue', 'significant_issue'] as const;
export const dietaryPreferenceValues = ['vegetarian', 'non_vegetarian', 'vegan', 'eggetarian', 'other'] as const;

// One row = one wizard submission = one checkup event. Append-only: corrections are new
// rows, never updates, so growth-curve time series stay intact.
export const healthRecords = pgTable(
  'health_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    recordedBy: uuid('recorded_by')
      .notNull()
      .references(() => users.id),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
    ageYears: numeric('age_years', { precision: 4, scale: 1 }).notNull(),
    // Physical vitals
    heightCm: numeric('height_cm', { precision: 5, scale: 1 }).notNull(),
    weightKg: numeric('weight_kg', { precision: 5, scale: 1 }).notNull(),
    bmi: numeric('bmi', { precision: 5, scale: 2 }).generatedAlwaysAs(
      sql`weight_kg / ((height_cm / 100) ^ 2)`,
    ),
    heartRateBpm: integer('heart_rate_bpm'),
    bloodPressureSystolic: integer('blood_pressure_systolic'),
    bloodPressureDiastolic: integer('blood_pressure_diastolic'),
    // Clinical indicators
    visionLeftAcuity: text('vision_left_acuity'),
    visionRightAcuity: text('vision_right_acuity'),
    dentalHygieneStatus: text('dental_hygiene_status', { enum: dentalHygieneValues }).notNull(),
    hearingStatus: text('hearing_status', { enum: hearingStatusValues }).notNull(),
    postureStatus: text('posture_status', { enum: postureStatusValues }).notNull(),
    // Medical history (snapshot as reported at this visit)
    knownAllergies: text('known_allergies').array().notNull().default([]),
    chronicConditions: text('chronic_conditions').array().notNull().default([]),
    currentMedications: text('current_medications').array().notNull().default([]),
    // Lifestyle
    avgSleepHours: numeric('avg_sleep_hours', { precision: 3, scale: 1 }).notNull(),
    physicalActivityDaysPerWeek: integer('physical_activity_days_per_week').notNull(),
    dietaryPreference: text('dietary_preference', { enum: dietaryPreferenceValues }).notNull(),
    additionalNotes: jsonb('additional_notes').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('health_records_student_recorded_at_idx').on(table.studentId, table.recordedAt.desc())],
);

// Cache: OpenAI-derived score/summary for one health_records row. Keyed uniquely by
// health_record_id so a screen view can check-then-generate instead of re-calling OpenAI.
export const aiInsights = pgTable('ai_insights', {
  id: uuid('id').primaryKey().defaultRandom(),
  healthRecordId: uuid('health_record_id')
    .notNull()
    .unique()
    .references(() => healthRecords.id),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id),
  healthScore: integer('health_score').notNull(),
  summary: text('summary').notNull(),
  flags: jsonb('flags').notNull().default([]),
  model: text('model').notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const riskSeverityValues = ['low', 'medium', 'high'] as const;
export type RiskSeverity = (typeof riskSeverityValues)[number];

export const interventionCategoryValues = ['lifestyle', 'medical_consultation'] as const;
export type InterventionCategory = (typeof interventionCategoryValues)[number];

export const riskFlagStatusValues = ['open', 'acknowledged', 'resolved'] as const;
export type RiskFlagStatus = (typeof riskFlagStatusValues)[number];

export const riskFlags = pgTable(
  'risk_flags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    sourceRecordId: uuid('source_record_id').references(() => healthRecords.id),
    riskType: text('risk_type').notNull(),
    severity: text('severity', { enum: riskSeverityValues }).notNull(),
    rationale: text('rationale').notNull(),
    suggestedIntervention: text('suggested_intervention').notNull(),
    interventionCategory: text('intervention_category', { enum: interventionCategoryValues }).notNull(),
    status: text('status', { enum: riskFlagStatusValues }).notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: uuid('resolved_by').references(() => users.id),
  },
  (table) => [index('risk_flags_student_status_idx').on(table.studentId, table.status)],
);

export const cohortMetricValues = ['bmi', 'illness_rate', 'overall'] as const;
export type CohortMetric = (typeof cohortMetricValues)[number];

// Cache: cohort-level aggregate + AI summary for a section's heatmap cell. The raw
// average is cheap SQL and always fresh; only the AI summary is cached, on a TTL
// checked in the service layer against generatedAt.
export const cohortInsights = pgTable(
  'cohort_insights',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sectionId: uuid('section_id')
      .notNull()
      .references(() => sections.id),
    metric: text('metric', { enum: cohortMetricValues }).notNull(),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    avgValue: numeric('avg_value', { precision: 6, scale: 2 }).notNull(),
    aiSummary: text('ai_summary').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.sectionId, table.metric, table.periodStart, table.periodEnd)],
);

// Rolling narrative folded incrementally as new health_records come in, so the
// chatbot's system prompt stays a small constant size regardless of a student's
// checkup history length.
export const studentContextSummaries = pgTable('student_context_summaries', {
  studentId: uuid('student_id')
    .primaryKey()
    .references(() => students.id),
  summaryText: text('summary_text').notNull(),
  basedOnRecordId: uuid('based_on_record_id').references(() => healthRecords.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const chatConversations = pgTable(
  'chat_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  },
  (table) => [unique().on(table.studentId, table.userId)],
);

export const chatMessageRoleValues = ['user', 'assistant'] as const;
export type ChatMessageRole = (typeof chatMessageRoleValues)[number];

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => chatConversations.id),
    role: text('role', { enum: chatMessageRoleValues }).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('chat_messages_conversation_created_at_idx').on(table.conversationId, table.createdAt)],
);
