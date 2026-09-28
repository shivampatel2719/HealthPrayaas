import express from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { academicRouter } from "./modules/academic/academic.routes.js";
import { analyticsRouter } from "./modules/analytics/analytics.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { healthRecordsRouter } from "./modules/health-records/health-records.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.use("/api", healthRouter);
  app.use("/api", authRouter);
  app.use("/api", academicRouter);
  app.use("/api", healthRecordsRouter);
  app.use("/api", analyticsRouter);
  app.use("/api", chatRouter);

  app.use(errorHandler);

  return app;
}
