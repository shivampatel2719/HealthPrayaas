import { z } from "zod";
import { cohortMetricValues, riskFlagStatusValues } from "../../db/schema.js";

export const heatmapQuerySchema = z.object({
  metric: z.enum(cohortMetricValues).default("overall"),
});
export type HeatmapQuery = z.infer<typeof heatmapQuerySchema>;

export const updateRiskFlagSchema = z.object({
  status: z.enum(riskFlagStatusValues),
});
export type UpdateRiskFlagInput = z.infer<typeof updateRiskFlagSchema>;
