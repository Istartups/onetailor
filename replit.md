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
- API: Express 5 (port 3000, proxied as `/api`)
- DB: PostgreSQL + Drizzle ORM (13 tables)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind + Wouter + Zustand + TanStack Query

## Where things live

- `artifacts/one-tailor/` — PWA for tailors (port 5000, path `/` — default preview)
- `artifacts/admin-portal/` — Admin dashboard (port 3002, path `/admin-portal/`)
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

2. **Install dependencies** — open the Shell tab and run `pnpm install` from the workspace root. This is required on every fresh import — workflows will fail silently with `node_modules missing` until this is done.

3. **Restart all three workflows** — after install completes, restart `API Server`, `Admin Portal`, and `OneTailor PWA` from the Workflows panel. The preview will be blank until all three are running.

4. **Hard-refresh the preview** — wait ~5 seconds after workflows show "Running", then press Ctrl+Shift+R (Cmd+Shift+R on Mac) in the Replit preview pane.

5. **Ports** — handled automatically by Replit's proxy:
   - PWA: port `5000` → default preview URL (path `/`)
   - Admin Portal: port `3002` → path `/admin-portal/`
   - API Server: port `3000` → proxied as `/api`

6. **First boot** — the API server auto-migrates all tables on startup. The default admin account (`admin` / `admin123`) is created on first request if no admin exists.

## FIXLIVE — App Blank / Preview Not Showing

**Most common cause after a fresh import: `node_modules` are missing.** Run `pnpm install` in the Shell, then restart all workflows.

### Step-by-step fix

1. **Install packages first** (fresh import only) — open the Shell tab and run:
   ```
   pnpm install
   ```
   Wait for `Done in Xs` before proceeding. If workflows were already started before install, they will have failed — that's expected.

2. **Restart all three workflows** — go to the Workflows panel and restart each one:
   - `API Server`
   - `Admin Portal`
   - `OneTailor PWA`
   
   Each must show **"Running"** with log output. A workflow showing no logs has silently exited — restart it.

3. **Confirm the API server booted** — check the `API Server` workflow log for this line:
   ```
   🚀 Backend Server running at http://127.0.0.1:3000
   ```
   If missing, the API server crashed — check its log for errors.

4. **Hard-refresh the preview** — after all three are running, wait ~5 seconds then press **Ctrl+Shift+R** (or Cmd+Shift+R on Mac) in the Replit preview pane.

5. **Check you're on the right port** — use the port selector at the top of the preview pane:
   - **PWA** (default preview): port `5000` — path `/`
   - **Admin Portal**: port `3002` — path `/admin-portal/`
   - Logging in to Admin: `admin` / `admin123`

6. **Apps load but show no data / 500 errors** — the API Server workflow is down. Restart it and wait for the `🚀 Backend Server running` log line before refreshing the frontend.

## Gotchas

- The `@xenova/transformers` + `@ffmpeg/*` packages are NOT installed (package firewall 403). They are shimmed via Vite aliases. If those video/ML features are needed, they must be replaced with environment-compatible alternatives.
- `is_debug_mode` and `is_usage_limit_enabled` columns on `payment_settings` are added via the auto-migration at startup (not in the initial `CREATE TABLE`). On first boot there may be a single 500 on `/api/payment-info` before the migration finishes.
- Do not run `pnpm dev` at the workspace root — use `restart_workflow` instead.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
