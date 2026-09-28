import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { logger } from "./lib/logger.js";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`HealthPrayaas backend listening on port ${env.PORT}`);
});
