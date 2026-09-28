import type { healthRecords } from "../../db/schema.js";

type StudentContext = { fullName: string; gender: string };
type HealthRecordContext = typeof healthRecords.$inferSelect;

export function formatHealthRecordContext(student: StudentContext, record: HealthRecordContext): string {
  return [
    `Student: ${student.fullName} (${student.gender}, age ${record.ageYears})`,
    `Vitals: height ${record.heightCm}cm, weight ${record.weightKg}kg, BMI ${record.bmi ?? "n/a"}, heart rate ${record.heartRateBpm ?? "n/a"} bpm, blood pressure ${record.bloodPressureSystolic ?? "n/a"}/${record.bloodPressureDiastolic ?? "n/a"}`,
    `Clinical: vision L/R ${record.visionLeftAcuity ?? "n/a"}/${record.visionRightAcuity ?? "n/a"}, dental hygiene ${record.dentalHygieneStatus}, hearing ${record.hearingStatus}, posture ${record.postureStatus}`,
    `Medical history: allergies [${record.knownAllergies.join(", ") || "none"}], chronic conditions [${record.chronicConditions.join(", ") || "none"}], medications [${record.currentMedications.join(", ") || "none"}]`,
    `Lifestyle: average sleep ${record.avgSleepHours}h/night, physical activity ${record.physicalActivityDaysPerWeek} days/week, diet ${record.dietaryPreference}`,
  ].join("\n");
}

export const INSIGHT_SYSTEM_PROMPT = `You are a pediatric health analyst for a school health tracking system. Given one checkup's data for a student, respond with ONLY a JSON object of this exact shape:
{"healthScore": <integer 0-100>, "summary": "<one or two sentence plain-language summary of this checkup>", "flags": ["<short flag label>", ...]}
healthScore reflects overall wellness for this checkup (100 = excellent, 0 = severe concern). flags is a short list of concise anomaly labels (e.g. "low_bmi", "elevated_heart_rate"); use an empty array if nothing stands out. Do not include any text outside the JSON object.`;

export const RISK_SYSTEM_PROMPT = `You are a pediatric health risk-screening assistant for a school health tracking system. Given a student's checkup data, identify any health risks worth flagging for staff attention. Respond with ONLY a JSON object of this exact shape:
{"risks": [{"riskType": "<short_snake_case_label>", "severity": "low"|"medium"|"high", "rationale": "<one sentence why this is flagged, referencing the specific data point(s)>", "suggestedIntervention": "<one concrete, actionable suggestion>", "interventionCategory": "lifestyle"|"medical_consultation"}]}
Only include genuinely notable risks grounded in the provided data (e.g. correlating low sleep and low physical activity with immune vulnerability, or an abnormal vital sign). Use an empty risks array if nothing is genuinely concerning. Do not include any text outside the JSON object.`;
