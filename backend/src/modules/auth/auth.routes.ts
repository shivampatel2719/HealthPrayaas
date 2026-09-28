import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateBody } from "../../middleware/validate.js";
import { NotFoundError } from "../../lib/errors.js";
import { loginSchema, registerSchema } from "./auth.schema.js";
import { getUserById, login, register } from "./auth.service.js";

export const authRouter = Router();

authRouter.post("/auth/login", validateBody(loginSchema), async (req, res) => {
  const result = await login(req.body);
  res.json(result);
});

authRouter.get("/auth/me", requireAuth, async (req, res) => {
  const user = await getUserById(req.user!.id);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  res.json(user);
});

authRouter.post(
  "/auth/register",
  requireAuth,
  requireRole("admin"),
  validateBody(registerSchema),
  async (req, res) => {
    const user = await register(req.body);
    res.status(201).json(user);
  },
);
