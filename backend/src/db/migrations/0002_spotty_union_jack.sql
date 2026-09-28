CREATE TABLE "ai_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"health_record_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"health_score" integer NOT NULL,
	"summary" text NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_insights_health_record_id_unique" UNIQUE("health_record_id")
);
--> statement-breakpoint
CREATE TABLE "cohort_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"metric" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"avg_value" numeric(6, 2) NOT NULL,
	"ai_summary" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cohort_insights_section_id_metric_period_start_period_end_unique" UNIQUE("section_id","metric","period_start","period_end")
);
--> statement-breakpoint
CREATE TABLE "risk_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"source_record_id" uuid,
	"risk_type" text NOT NULL,
	"severity" text NOT NULL,
	"rationale" text NOT NULL,
	"suggested_intervention" text NOT NULL,
	"intervention_category" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid
);
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_health_record_id_health_records_id_fk" FOREIGN KEY ("health_record_id") REFERENCES "public"."health_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohort_insights" ADD CONSTRAINT "cohort_insights_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_flags" ADD CONSTRAINT "risk_flags_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_flags" ADD CONSTRAINT "risk_flags_source_record_id_health_records_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."health_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_flags" ADD CONSTRAINT "risk_flags_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "risk_flags_student_status_idx" ON "risk_flags" USING btree ("student_id","status");