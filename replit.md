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

## GitHub Export & Import to a New Replit

When you export this project to GitHub and import it into a new Replit:

1. **Set required secrets** — the new environment will be missing these; add them in Secrets:
   - `DATABASE_URL` — provision a new PostgreSQL database (Replit Database tab) and paste the connection string
   - `SESSION_SECRET` — any long random string (e.g. `openssl rand -hex 32`)

2. **Install dependencies** — run `pnpm install` once from the workspace root after import.

3. **No port conflicts** — ports are configured via env vars and handled by Replit's proxy automatically:
   - API server: `8080` (hardcoded in `artifacts/api-server/src/index.ts`)
   - Admin Portal: `3002` (set via `PORT=3002` in the workflow command; change if needed)
   - PWA: `5000` (default; change `PORT` env in the workflow command if needed)

4. **Workflows are preserved** — the `.replit` file is committed, so all three workflows (API Server, Admin Portal, OneTailor PWA) restore automatically.

5. **First boot** — the API server auto-migrates all tables on startup. The default admin account (`admin` / `admin123`) is created on the first request if no admin exists.

## FIXLIVE — App Blank / Preview Not Showing

If the PWA or Admin Portal appears blank or the preview iframe shows nothing:

1. **Restart the workflows** — Go to the Workflows panel and restart both `OneTailor PWA` and `Admin Portal`. The Vite dev servers sometimes lose their HMR connection after inactivity or a container sleep.
2. **Confirm all three are running** — API Server, Admin Portal, and OneTailor PWA must all show "Running" with output in their logs. If a workflow shows no log output, it has silently exited — restart it.
3. **Hard-refresh the preview** — After restarting, wait ~5 seconds then hard-refresh (Ctrl+Shift+R / Cmd+Shift+R) in the Replit preview pane.
4. **Check the correct port** — Admin Portal runs on port `3002` (path `/admin-portal/`); PWA runs on port `5000` (path `/`). If the Replit preview pane is pointing at the wrong port, switch it using the port selector at the top of the preview pane.
5. **API Server down** — If the apps load but show empty data or 500 errors, check the API Server workflow. It runs on port `3000` internally (proxied as `/api`). Restart it and wait for the `🚀 Backend Server running` log line.

## Gotchas

- The `@xenova/transformers` + `@ffmpeg/*` packages are NOT installed (package firewall 403). They are shimmed via Vite aliases. If those video/ML features are needed, they must be replaced with environment-compatible alternatives.
- `is_debug_mode` and `is_usage_limit_enabled` columns on `payment_settings` are added via the auto-migration at startup (not in the initial `CREATE TABLE`). On first boot there may be a single 500 on `/api/payment-info` before the migration finishes.
- Do not run `pnpm dev` at the workspace root — use `restart_workflow` instead.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
