# OneTailor Toolkit

A full-stack business tools platform for tailors (PWA) with an admin dashboard for managing users, licenses, payments, and settings.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port set by workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (provisioned), `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080 via workflow, path `/api`)
- DB: PostgreSQL + Drizzle ORM (13 tables)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind + Wouter + Zustand + TanStack Query

## Where things live

- `artifacts/one-tailor/` — PWA for tailors (port 25497, path `/`)
- `artifacts/admin-portal/` — Admin dashboard (port 25580, path `/admin-portal/`)
- `artifacts/api-server/src/routes/` — Express route handlers (admin, license, payment, user, tailoring, notification)
- `lib/db/src/schema/index.ts` — Drizzle schema (source of truth for all 13 tables)
- `lib/api-spec/openapi.yaml` — OpenAPI spec

## Architecture decisions

- **Auto-migration at startup**: The API server (`artifacts/api-server/src/index.ts`) runs `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS` on boot so schema changes are applied without a separate migration step.
- **Blocked packages shimmed**: `@xenova/transformers`, `@ffmpeg/ffmpeg`, `@ffmpeg/util` are blocked by the package firewall. They are aliased in Vite to lightweight shims (`src/shims/`) so the build succeeds; video/ML pages gracefully degrade.
- **DB provisioned**: The PostgreSQL database is provisioned and `DATABASE_URL` is set via environment secrets.
- **Default admin**: Created on first server boot — username `admin`, password `admin123`.

## Product

- **OneTailor PWA** (`/`): Customer management, body measurements, garment pricing advisor, payment collection, push notifications, business profile. Works offline via service worker.
- **Admin Portal** (`/admin-portal/`): Dashboard with user/license/payment management, settings configuration, analytics. Default login: `admin` / `admin123`.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The `@xenova/transformers` + `@ffmpeg/*` packages are NOT installed (package firewall 403). They are shimmed via Vite aliases. If those video/ML features are needed, they must be replaced with environment-compatible alternatives.
- `is_debug_mode` and `is_usage_limit_enabled` columns on `payment_settings` are added via the auto-migration at startup (not in the initial `CREATE TABLE`). On first boot there may be a single 500 on `/api/payment-info` before the migration finishes.
- Do not run `pnpm dev` at the workspace root — use `restart_workflow` instead.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
