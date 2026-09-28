import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateBody } from "../../middleware/validate.js";
import {
  createClassSchema,
  createSectionSchema,
  createStudentSchema,
  updateStudentSchema,
} from "./academic.schema.js";
import {
  createClass,
  createSection,
  createStudent,
  deactivateStudent,
  getStudent,
  listClasses,
  listSectionsByClass,
  listStudentsBySection,
  updateStudent,
} from "./academic.service.js";

export const academicRouter = Router();

academicRouter.use(requireAuth);

academicRouter.get("/classes", async (_req, res) => {
  res.json(await listClasses());
});

academicRouter.post("/classes", requireRole("admin"), validateBody(createClassSchema), async (req, res) => {
  res.status(201).json(await createClass(req.body));
});

academicRouter.get("/classes/:classId/sections", async (req, res) => {
  res.json(await listSectionsByClass(req.params.classId));
});

academicRouter.post<{ classId: string }>(
  "/classes/:classId/sections",
  requireRole("admin"),
  validateBody(createSectionSchema),
  async (req, res) => {
    res.status(201).json(await createSection(req.params.classId, req.body));
  },
);

academicRouter.get("/sections/:sectionId/students", async (req, res) => {
  res.json(await listStudentsBySection(req.params.sectionId));
});

academicRouter.post("/students", requireRole("admin"), validateBody(createStudentSchema), async (req, res) => {
  res.status(201).json(await createStudent(req.body));
});

academicRouter.get("/students/:studentId", async (req, res) => {
  res.json(await getStudent(req.params.studentId));
});

academicRouter.patch<{ studentId: string }>(
  "/students/:studentId",
  requireRole("admin"),
  validateBody(updateStudentSchema),
  async (req, res) => {
    res.json(await updateStudent(req.params.studentId, req.body));
  },
);

academicRouter.delete<{ studentId: string }>("/students/:studentId", requireRole("admin"), async (req, res) => {
  await deactivateStudent(req.params.studentId);
  res.status(204).send();
});
