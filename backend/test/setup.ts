import dotenv from "dotenv";

// Loaded before any test file, so this wins over env.ts's later plain `dotenv/config`
// call (which never overrides already-set vars) — tests run against .env.test's
// separate database, not the dev one.
dotenv.config({ path: ".env.test", override: true });
