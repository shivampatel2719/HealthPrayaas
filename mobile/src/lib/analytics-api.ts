import { apiRequest } from '@/lib/api-client';
import type { HealthRecordDto } from '@/lib/health-records-api';

export type AiInsightDto = {
  id: string;
  healthRecordId: string;
  studentId: string;
  healthScore: number;
  summary: string;
  flags: string[];
  model: string;
  generatedAt: string;
};

export type GrowthCurvePoint = {
  record: HealthRecordDto;
  insight: AiInsightDto | null;
};

export type CohortMetric = 'bmi' | 'illness_rate' | 'overall';

export type HeatmapResult = {
  metric: CohortMetric;
  avgValue: number;
  sampleSize: number;
  aiSummary: string;
  generatedAt: string;
};

export type RiskSeverity = 'low' | 'medium' | 'high';
export type InterventionCategory = 'lifestyle' | 'medical_consultation';
export type RiskFlagStatus = 'open' | 'acknowledged' | 'resolved';

export type RiskFlagDto = {
  id: string;
  studentId: string;
  sourceRecordId: string | null;
  riskType: string;
  severity: RiskSeverity;
  rationale: string;
  suggestedIntervention: string;
  interventionCategory: InterventionCategory;
  status: RiskFlagStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
};

export function getGrowthCurve(token: string, studentId: string) {
  return apiRequest<GrowthCurvePoint[]>(`/api/students/${studentId}/analytics/growth-curve`, { token });
}

export function getHeatmap(token: string, sectionId: string, metric: CohortMetric) {
  return apiRequest<HeatmapResult>(`/api/sections/${sectionId}/analytics/heatmap?metric=${metric}`, { token });
}

export function listRiskFlags(token: string, studentId: string) {
  return apiRequest<RiskFlagDto[]>(`/api/students/${studentId}/risk-flags`, { token });
}

export function refreshRiskFlags(token: string, studentId: string) {
  return apiRequest<RiskFlagDto[]>(`/api/students/${studentId}/risk-flags/refresh`, { method: 'POST', token });
}

export function updateRiskFlag(token: string, flagId: string, status: RiskFlagStatus) {
  return apiRequest<RiskFlagDto>(`/api/risk-flags/${flagId}`, { method: 'PATCH', token, body: { status } });
}
