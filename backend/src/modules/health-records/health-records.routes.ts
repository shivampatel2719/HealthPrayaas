import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { createHealthRecordSchema, listHealthRecordsQuerySchema } from "./health-records.schema.js";
import { createHealthRecord, getHealthRecord, listHealthRecordsForStudent } from "./health-records.service.js";

export const healthRecordsRouter = Router();

healthRecordsRouter.use(requireAuth);

healthRecordsRouter.post<{ studentId: string }>("/students/:studentId/health-records", async (req, res) => {
  const input = createHealthRecordSchema.parse(req.body);
  const record = await createHealthRecord(req.params.studentId, req.user!.id, input);
  res.status(201).json(record);
});

healthRecordsRouter.get<{ studentId: string }>("/students/:studentId/health-records", async (req, res) => {
  const query = listHealthRecordsQuerySchema.parse(req.query);
  res.json(await listHealthRecordsForStudent(req.params.studentId, query));
});

healthRecordsRouter.get<{ recordId: string }>("/health-records/:recordId", async (req, res) => {
  res.json(await getHealthRecord(req.params.recordId));
});
