CREATE TABLE "health_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"age_years" numeric(4, 1) NOT NULL,
	"height_cm" numeric(5, 1) NOT NULL,
	"weight_kg" numeric(5, 1) NOT NULL,
	"bmi" numeric(5, 2) GENERATED ALWAYS AS (weight_kg / ((height_cm / 100) ^ 2)) STORED,
	"heart_rate_bpm" integer,
	"blood_pressure_systolic" integer,
	"blood_pressure_diastolic" integer,
	"vision_left_acuity" text,
	"vision_right_acuity" text,
	"dental_hygiene_status" text NOT NULL,
	"hearing_status" text NOT NULL,
	"posture_status" text NOT NULL,
	"known_allergies" text[] DEFAULT '{}' NOT NULL,
	"chronic_conditions" text[] DEFAULT '{}' NOT NULL,
	"current_medications" text[] DEFAULT '{}' NOT NULL,
	"avg_sleep_hours" numeric(3, 1) NOT NULL,
	"physical_activity_days_per_week" integer NOT NULL,
	"dietary_preference" text NOT NULL,
	"additional_notes" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "health_records_student_recorded_at_idx" ON "health_records" USING btree ("student_id","recorded_at" DESC NULLS LAST);