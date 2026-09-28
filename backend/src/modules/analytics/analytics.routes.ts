import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { heatmapQuerySchema, updateRiskFlagSchema } from "./analytics.schema.js";
import { getGrowthCurve, getHeatmap, listRiskFlags, refreshRiskFlags, setRiskFlagStatus } from "./analytics.service.js";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

const refreshLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

analyticsRouter.get<{ studentId: string }>("/students/:studentId/analytics/growth-curve", async (req, res) => {
  res.json(await getGrowthCurve(req.params.studentId));
});

analyticsRouter.get<{ sectionId: string }>("/sections/:sectionId/analytics/heatmap", async (req, res) => {
  const query = heatmapQuerySchema.parse(req.query);
  res.json(await getHeatmap(req.params.sectionId, query.metric));
});

analyticsRouter.get<{ studentId: string }>("/students/:studentId/risk-flags", async (req, res) => {
  res.json(await listRiskFlags(req.params.studentId));
});

analyticsRouter.post<{ studentId: string }>(
  "/students/:studentId/risk-flags/refresh",
  refreshLimiter,
  async (req, res) => {
    res.json(await refreshRiskFlags(req.params.studentId));
  },
);

analyticsRouter.patch<{ flagId: string }>(
  "/risk-flags/:flagId",
  validateBody(updateRiskFlagSchema),
  async (req, res) => {
    res.json(await setRiskFlagStatus(req.params.flagId, req.body.status, req.user!.id));
  },
);
