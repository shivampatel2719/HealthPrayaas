# HealthPrayaas

Mobile app for tracking student health data with OpenAI-powered analytics and a per-student chatbot. See [`docs/architecture.md`](docs/architecture.md) for the full architecture and phased build plan.

Monorepo layout:
- `backend/` — Node.js + TypeScript + Express API (Postgres via Drizzle ORM)
- `mobile/` — React Native + Expo app (TypeScript)

## Backend

```bash
docker compose up -d          # starts local Postgres on localhost:5435
cd backend
cp .env.example .env          # first time only; add a real OPENAI_API_KEY to enable
                               # AI features (analytics/risk flags/chat) — everything
                               # else works without one
npm install
npm run db:migrate            # first time only, and after pulling new migrations
npm run db:seed                # first time only: 1 admin + demo classes/sections/students
npm run dev                    # http://localhost:4000, GET /api/health to check
npm test                       # runs against a separate healthprayaas_test database
```

Seeded logins: `admin@healthprayaas.dev` / `admin123` (admin), `teacher@healthprayaas.dev`
/ `teacher123` (teacher), `health@healthprayaas.dev` / `health123` (health staff).

`npm test` needs its own database the first time (matching `backend/.env.test`):

```bash
docker exec healthprayaas-postgres-1 psql -U healthprayaas -d healthprayaas -c "CREATE DATABASE healthprayaas_test"
DATABASE_URL="postgres://healthprayaas:healthprayaas@localhost:5435/healthprayaas_test" npx drizzle-kit migrate
```

## Mobile

```bash
cd mobile
cp .env.example .env           # first time only; set EXPO_PUBLIC_API_URL to this
                                # machine's LAN IP (ipconfig getifaddr en0), not localhost
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone (phone and computer must be on
the same Wi-Fi network), or press `a`/`i` in the terminal to launch an Android/iOS
simulator. The app calls the backend directly over the LAN, so the backend must be
running (see above) and reachable from your phone.

> Note: this machine's npm is routed through a corporate Artifactory proxy that blocks
> some public packages (`cors`, `eslint` both 403'd). `backend/.npmrc` and
> `mobile/.npmrc` pin those projects to the public npm registry so `npm install` works
> regardless of your global npm config. A few commands still shell out to npm in a way
> that bypasses the project `.npmrc` (e.g. `npx <package>` for something not yet
> installed) — if one 403s, prefix it: `npm_config_registry=https://registry.npmjs.org/ <command>`.
