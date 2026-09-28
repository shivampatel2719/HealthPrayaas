# HealthPrayaas — Architecture & Phased Build Plan

## Context

HealthPrayaas is a mobile app for tracking student health data with OpenAI-powered analytics and a per-student chatbot. The PRD specifies a Class -> Section -> Student data hierarchy, wizard-style health data entry, OpenAI-backed risk prediction/interventions/growth analytics, and a context-aware chatbot — all proxied through a backend so the OpenAI key never touches the client.

Locked-in decisions:
- **Backend:** Node.js + TypeScript + PostgreSQL
- **Repo layout:** Monorepo (`/mobile` + `/backend` in one repo)
- **Mobile:** React Native + Expo (TypeScript) — switched from an initial Kotlin/Jetpack Compose skeleton so the app can be previewed instantly on a physical phone via Expo Go's scan-a-QR-code flow, without an emulator or Android Studio.

## Monorepo Structure

```
HealthPrayaas/
├── mobile/                   # React Native + Expo app (TypeScript)
├── backend/                  # Node.js + TypeScript API (Express)
├── docs/
│   ├── api/openapi.yaml      # generated from backend zod schemas (contract source of truth)
│   └── architecture.md
├── docker-compose.yml        # local Postgres 16 for dev
├── .editorconfig
├── .gitignore
└── README.md
```

No Turborepo/Nx — the backend and mobile app are independent npm projects with zero shared code, so shared build tooling adds ceremony without payoff. The only shared artifact is the API contract in `docs/api/openapi.yaml`.

## Backend Architecture (`/backend`)

**Stack:** Express + TypeScript + zod (validation) + Drizzle ORM + `pg` + PostgreSQL.
- Express over Fastify: larger middleware ecosystem (helmet, cors, express-rate-limit), most familiar for solo debugging.
- Drizzle over Prisma: analytics needs raw SQL aggregates (time-series trends, `GROUP BY section_id`, window functions) and Drizzle's `sql\`...\`` escape hatch is far more ergonomic than Prisma's for this.

```
backend/src/
├── index.ts / app.ts
├── config/env.ts                # zod-validated process.env
├── db/{client.ts, schema.ts, migrations/, seed.ts}
├── middleware/{auth.ts, requireRole.ts, errorHandler.ts, validate.ts}
├── modules/
│   ├── auth/
│   ├── academic/                # classes / sections / students
│   ├── health-records/
│   ├── analytics/                # growth curve, heatmap, risk flags, interventions
│   └── chat/
├── integrations/openai/{client.ts, promptTemplates.ts, riskEngine.ts, insightEngine.ts}
├── lib/{jwt.ts, password.ts, logger.ts}
└── types/express.d.ts
```

### Auth
- bcrypt (cost 12) password hashing; stateless JWT (7-day expiry) — no refresh-token rotation in v1, simplest viable option for a single-institution internal tool.
- Roles on one `users` table: `admin` (full CRUD incl. roster/users), `teacher` and `health_staff` (view students, submit health records, view analytics, use chatbot). No self-registration — `seed.ts` creates the first admin; `admin`-only `POST /api/auth/register` onboards others.
- Mobile app stores `{accessToken, userId, role, fullName}` in `expo-secure-store`, attached via a fetch wrapper.

### PostgreSQL Schema

**Key decision:** `health_records` is **one wide table per checkup event** (not 5 normalized category tables, not JSONB-per-category). Every read/write touches all 5 PRD categories atomically (one wizard submission = one row), and analytics needs `AVG()`/`GROUP BY`/trend queries directly on numeric columns — JSONB would cripple that. A single `additional_notes jsonb` column is the only escape hatch, for free-text fields that don't need numeric querying. Records are **append-only** (no PATCH/DELETE) — corrections are new records, preserving time-series integrity for growth curves.

```
users            id, email, password_hash, full_name, role, is_active, timestamps
classes          id, name, grade_level
sections         id, class_id FK, name  (UNIQUE class_id+name)
students         id, section_id FK, roll_number, full_name, date_of_birth, gender, is_active
                 (UNIQUE section_id+roll_number; no denormalized class_id — join through sections)

health_records   id, student_id FK, recorded_by FK(users), recorded_at, age_years,
                 height_cm, weight_kg, bmi GENERATED ALWAYS AS (weight_kg/((height_cm/100)^2)) STORED,
                 heart_rate_bpm, blood_pressure_systolic/diastolic,
                 vision_left/right_acuity, dental_hygiene_status, hearing_status, posture_status,
                 known_allergies text[], chronic_conditions text[], current_medications text[],
                 avg_sleep_hours, physical_activity_days_per_week, dietary_preference,
                 additional_notes jsonb
                 INDEX (student_id, recorded_at DESC)

ai_insights      id, health_record_id FK UNIQUE (cache key), student_id, health_score,
                 summary, flags jsonb, model, generated_at

risk_flags       id, student_id FK, source_record_id FK, risk_type, severity,
                 rationale, suggested_intervention, intervention_category,
                 status ('open'|'acknowledged'|'resolved'), resolved_at, resolved_by
                 -- interventions live inline on the flag; no separate table needed for v1

cohort_insights  id, section_id FK, metric, period_start, period_end, avg_value, ai_summary,
                 generated_at   UNIQUE(section_id, metric, period_start, period_end) -- heatmap cache, 24h TTL

student_context_summaries   student_id PK, summary_text, based_on_record_id FK, updated_at
                 -- rolling narrative folded incrementally, keeps chatbot system prompt small
                 -- regardless of how many checkups a student has

chat_conversations   id, student_id FK, user_id FK, created_at, last_message_at
                      UNIQUE(student_id, user_id) -- one thread per (student, staff member)
chat_messages         id, conversation_id FK, role, content, created_at  INDEX(conversation_id, created_at)
```

### REST API

```
Auth:      POST /api/auth/login · GET /api/auth/me · POST /api/auth/register [admin]
Academic:  GET/POST /api/classes · GET/POST /api/classes/:id/sections
           GET /api/sections/:id/students · POST/GET/PATCH/DELETE /api/students(/:id)  [admin for writes]
Records:   POST /api/students/:id/health-records · GET .../health-records?limit=&before=
           GET /api/health-records/:recordId
Analytics: GET /api/students/:id/analytics/growth-curve
           GET /api/sections/:id/analytics/heatmap?metric=&period=
           GET /api/students/:id/risk-flags · POST .../risk-flags/refresh [rate-limited]
           PATCH /api/risk-flags/:id
Chat:      GET /api/students/:id/chat  (get-or-create + history)
           POST /api/students/:id/chat/messages  (SSE streaming response)
           GET /api/conversations/:id/messages?before=
Ops:       GET /api/health
```

### Chatbot context assembly & caching (avoids re-calling OpenAI per screen view)
- System prompt = student profile + `student_context_summaries.summary_text` (rolling narrative, not raw dump) + last 1–3 raw `health_records` + open `risk_flags`.
- Right after a `health_records` insert, a fire-and-forget async step folds the delta into `student_context_summaries`, regenerates `ai_insights` for that record, and re-runs risk detection — so caches are usually warm before a teacher opens the screen.
- `ai_insights` keyed by `health_record_id` (cache-or-generate). `cohort_insights` keyed by `(section_id, metric, period)` with 24h TTL. `risk_flags/refresh` no-ops if the student's latest record hasn't changed since last generation, and is rate-limited.
- Chat streaming: OpenAI SDK stream forwarded as SSE (`text/event-stream`); both sides persisted to `chat_messages` once the stream completes. Long conversations are summarized past a message-count threshold, same sliding-window pattern as the health-history summary.

### Backend libraries
`express`, `zod` (+ `zod-to-openapi`), `drizzle-orm`/`drizzle-kit`/`pg`, `jsonwebtoken`, `bcrypt`, `openai`, `helmet`, `cors`, `express-rate-limit`, `pino`/`pino-http`, `dotenv`, `tsx` (dev runner), `vitest`+`supertest` (tests).

## Mobile Architecture (`/mobile`)

**Stack:** React Native + Expo (SDK 57) + TypeScript, Expo Router for file-based navigation. Scaffolded via `create-expo-app`'s default template (Router + TypeScript already wired), then stripped of its tab-based demo content down to a single light-themed screen.

```
mobile/src/
├── app/                       # Expo Router: one file = one screen
│   ├── _layout.tsx            # root Stack navigator, PaperProvider, auth gate
│   ├── login.tsx
│   ├── index.tsx              # Students: cascading Class/Section picker + list
│   ├── admin/create-user.tsx  # admin-only: provision teacher/health_staff/admin logins
│   ├── insights/[classId].tsx # cohort heatmap
│   └── students/
│       ├── create.tsx         # admin-only: add a student to the selected section
│       └── [studentId]/{index,new-health-record,chat}.tsx
├── components/
│   ├── chip-row.tsx           # Paper Chip row for cascading selectors
│   ├── growth-curve-chart.tsx # hand-rolled react-native-svg line chart
│   └── heatmap-grid.tsx       # hand-rolled react-native-svg-free grid (Paper Surface cells)
├── constants/paper-theme.ts   # MD3 theme mapped to our brand colors
├── store/auth-store.ts        # zustand: session + role, persisted via expo-secure-store
└── lib/                       # one fetch-wrapper module per backend resource
```

- **UI library: React Native Paper (MD3).** The first pass hand-rolled every button/chip/input with raw `Pressable`/`StyleSheet` — it looked cheap and was called out as such. Replaced with Paper's `Button`, `Chip`, `TextInput`, `Card`, `SegmentedButtons`, `FAB`, `List.Item`, etc., themed via `constants/paper-theme.ts` (MD3LightTheme with primary `#1976D2` / background `#FAFAFA`). Pure JS, no native linking beyond what Expo Go already bundles. The old hand-rolled `ThemedText`/`ThemedView`/`constants/theme.ts` were deleted once nothing referenced them anymore.
- **Networking:** plain `fetch()` wrapped per-resource in `src/lib/` (`api-client.ts`'s `apiRequest` + per-module functions). Auth attaches a `Authorization: Bearer` header from the zustand store; a 401 anywhere triggers auto-logout. The chat endpoint streams via `expo/fetch`'s `response.body.getReader()` (confirmed supported on this SDK before building on it, not assumed).
- **State:** zustand (`store/auth-store.ts`) for the auth session (token, user, role), persisted through `expo-secure-store`; everything else is local component state.
- **Navigation:** Expo Router — routes are files under `src/app/`; a login/list/profile/chat drill-down via nested `Stack` navigators (no tab bar, per the PRD's flow). Route params use the typed `{ pathname: '/x/[y]', params: { y } }` object form, not template strings.
- **Cascading selectors:** a Class `ChipRow` whose `onSelect` fetches Sections, whose `onSelect` fetches Students. Resets to downstream state happen in the select *handler*, not in the fetch effect, to satisfy React's `set-state-in-effect` lint rule (calling setState synchronously inside an effect body is flagged; the fetch effects only read the already-selected id and populate state from the async response).
- **Wizard form:** one `FormState` object in `HealthFormViewModel`-equivalent local state, `currentStep` + a `canGoNext` per-step validator, `ProgressBar` (Paper) bound to step index. BMI derived live from height/weight.
- **Charting:** hand-rolled `react-native-svg` line chart for the growth curve and a `Surface`-based grid for the heatmap — deliberately not `victory-native` or any Skia-based charting library, since those need a custom dev client and would break the explicit "scan a QR with plain Expo Go" requirement.
- **Chat:** SSE parsed manually in `lib/chat-api.ts` (split on `\n\n`, `data: {...}` frames), streamed bubbles in a `FlatList` with a `Surface`-based bubble per message.
- **Admin-provisioned accounts, not public sign-up:** the login screen has no sign-up link by design — new teacher/health_staff/admin accounts are created by an existing admin via `admin/create-user.tsx` (calls the existing admin-only `POST /api/auth/register`), matching a school tool's security model.

### Mobile libraries
`expo` + `expo-router`, `expo-secure-store`, `zustand`, `react-native-paper` (MD3 components), `react-native-svg` (hand-rolled charts, not a charting library), `expo/fetch` (SSE streaming, no extra package).

### Gotcha encountered: Metro's `transform.routerRoot` param
Manually fetching `/node_modules/expo-router/entry.bundle?platform=android&dev=true` to verify a build **silently bundles an empty route tree** if you omit `transform.routerRoot=src/app` (and `lazy=true`) — Metro doesn't error, it just doesn't find any routes, so a "no resolve errors" check passes without ever having exercised real app code. The correct URL comes from the dev server's own manifest (`curl -H "Accept: application/json" -H "Expo-Platform: android" http://localhost:8081/`, read `launchAsset.url`). Verify against literal on-screen text (e.g. a button label), not just the absence of `UnableToResolveError` — and not just a component's function name, since that alone doesn't prove the route tree was found.

## Phased Build Roadmap

Each phase leaves both apps runnable end-to-end.

1. **Phase 0 — Scaffolding.** ✅ Done. Backend Express skeleton + `GET /api/health` hitting Postgres via docker-compose; mobile Expo app with theme applied, a health-check screen calling `/api/health`.
   *Verify:* `curl localhost:4000/api/health` → 200; `npx expo start` in `mobile/`, scan the QR with Expo Go (same Wi-Fi) or press `a`/`i` for a simulator, see the themed screen with live "Backend: OK".

2. **Phase 1 — Auth + core hierarchy.** ✅ Done. Backend: migrations/seed for users/classes/sections/students (seed = 1 admin + demo data), auth module (login/JWT/`requireRole`), academic CRUD + cascading GETs. Mobile: login screen → `expo-secure-store` token storage → auth header on requests; cascading Class/Section selector wired to a student list screen; bare student profile screen.
   *Verify:* curl login returns JWT; cascading GETs filter correctly with bearer token; on device: log in, pick Class→Section, watch student list update live, open a profile.

3. **Phase 2 — Health data wizard.** ✅ Done. Backend: `health_records` migration (BMI generated column) + submit/history endpoints. Mobile: full 5-step wizard with progress bar + validation; profile screen gains "New Health Check" + history list.
   *Verify:* curl POST a full payload, confirm via history GET/psql; on device: complete wizard incl. a validation error, watch BMI live-calculate, submit, see it in history.

4. **Phase 3 — Analytics with caching.** ✅ Done. Backend: growth-curve endpoint (pure SQL), `ai_insights` cache + insight engine, heatmap endpoint + `cohort_insights` TTL cache, `risk_flags` + risk engine + no-op-aware refresh endpoint. Mobile: growth-curve chart (hand-rolled `react-native-svg`, not a Skia-based lib — see Mobile Architecture) + AI summary card, class insights heatmap screen, risk-flags section with acknowledge/resolve.
   *Verify:* call growth-curve endpoint twice, confirm 2nd is a cache hit (no 2nd OpenAI call in logs); heatmap shows differing aggregates across seeded sections; on device: student with seeded history shows chart, AI summary, heatmap, flagged risks + interventions.

5. **Phase 4 — Context-aware chatbot.** ✅ Done. Backend: chat tables, `student_context_summaries` + incremental-update hook fired from record submission, get-or-create conversation endpoint, SSE streaming send-message endpoint with persistence. Mobile: persistent chat FAB on the student profile, chat screen streaming via `expo/fetch`'s readable-stream body.
   *Verify:* `curl -N` the chat endpoint and watch raw SSE chunks; confirm messages persist; ask about a specific seeded student's real data (e.g. an allergy) and confirm the answer reflects it — proves context assembly, not a generic reply; on device: open chat from profile, watch streamed reply, reopen to confirm history reload.

6. **Phase 5 — Polish + testing.** ✅ Done. Backend: rate limiting on OpenAI routes (risk-flags refresh, chat messages), consistent AppError-based error responses (including a clear 503 when `OPENAI_API_KEY` isn't set, rather than a generic 500), vitest+supertest happy-path coverage for auth/academic/health-records against a dedicated test database, finalized README/.env.example. Mobile: typecheck/lint clean across all phases, expo-doctor 21/21.
   *Verify:* `npm test` (backend) green — 8/8 passing; `npx tsc --noEmit` + `npx expo lint` (mobile) clean; full-stack boot verified (backend health check + Metro bundle both live simultaneously).

## Critical Files
- `backend/src/db/schema.ts` — the full Drizzle schema
- `backend/src/modules/chat/chat.service.ts` — prompt assembly + SSE streaming
- `backend/src/modules/analytics/analytics.service.ts` — growth curve SQL, heatmap aggregates, cache read-through
- `backend/test/api.test.ts` — happy-path coverage for auth/academic/health-records
- `mobile/src/lib/api-client.ts` — shared fetch/auth layer (401 → auto-logout)
- `mobile/src/app/_layout.tsx` — root navigator, auth gate, theme

## Known simplifications (documented, not silent)
- Chat's sliding-window history keeps only the last 20 messages verbatim; the
  architecture's planned "fold older turns into a running summary" step isn't
  implemented — long conversations just lose earlier context rather than summarizing it.
- Heatmap period bucketing is simplified to "as of today" (periodStart = periodEnd =
  today's date) rather than real historical date-range windowing.
- `illness_rate` heatmap metric is a composite proxy (posture/hearing/dental/chronic
  conditions issues on a student's latest checkup), not a literal PRD-defined field.
- Mobile has no automated component/unit tests yet (backend does). Verification for
  Phases 1-4 was typecheck + lint + live bundle compilation, not a RN testing library.

## Local dev environment notes
- npm on this machine is routed through a corporate Artifactory proxy that blocks some
  public packages (e.g. `cors`, `eslint` both returned 403s). `backend/.npmrc` and
  `mobile/.npmrc` pin those projects to the public npm registry (`registry.npmjs.org`)
  so installs work regardless of global npm config — scoped to each repo, not global.
  Some commands (`npx <pkg>` for a package not yet installed, `expo lint`'s first-run
  ESLint install) shell out to npm in a way that ignores the project `.npmrc` and picks
  up the corporate registry from the shell's `npm_config_registry` env var instead — if
  a command 403s on a public package, prefix it with
  `npm_config_registry=https://registry.npmjs.org/`.
- The default Postgres port 5432 is already taken by a native Homebrew
  `postgresql@14` service on this machine (and 5433/5434/5436/5437 by other local
  Docker projects), so `docker-compose.yml` maps this project's Postgres container to
  host port **5435** instead. `DATABASE_URL` in `backend/.env(.example)` matches.
- Expo Go on a physical phone reaches the backend directly over the LAN (there's no
  `10.0.2.2`-style loopback alias like an Android emulator gets), so
  `mobile/.env(.example)`'s `EXPO_PUBLIC_API_URL` is set to this machine's LAN IP
  (`192.168.31.133` at time of writing — re-check with `ipconfig getifaddr en0` if it
  stops connecting, e.g. after reconnecting Wi-Fi). The phone and this machine must be
  on the same Wi-Fi network; if that network isolates devices from each other (common
  on corporate/guest Wi-Fi), fall back to `npx expo start --tunnel` for the Metro
  connection, though the backend itself still needs to be reachable some other way in
  that case (e.g. a temporary tunnel for port 4000 too, or run backend + phone on a
  home network).
