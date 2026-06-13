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

2. **Press Run** — each workflow auto-detects missing `node_modules` and runs `pnpm install` automatically before starting. No manual install needed.

3. **Wait ~60–90 seconds** on first boot (install + Vite compile). Subsequent starts take ~5 seconds.

4. **Ports** — handled automatically by Replit's proxy:
   - PWA: port `5000` → default preview URL (path `/`)
   - Admin Portal: port `3002` → path `/admin-portal/`
   - API Server: port `3000` → proxied as `/api`

5. **First boot** — the API server auto-migrates all tables on startup. The default admin account (`admin` / `admin123`) is created on first request if no admin exists.

## FIXLIVE — App Blank / Preview Not Showing

### Normal first-boot (fresh import)

Each workflow command includes an auto-install guard — it runs `pnpm install` automatically if `node_modules` is missing. You should not need to do anything manually. Just press Run and wait ~60–90 seconds.

If the preview is still blank after 2 minutes:

1. **Check all three workflows are "Running"** — go to the Workflows panel. Each of `API Server`, `Admin Portal`, and `OneTailor PWA` must show **"Running"** with log output. If any shows no output, click Restart on it.

2. **Confirm the API server booted** — check the `API Server` log for:
   ```
   🚀 Backend Server running at http://127.0.0.1:3000
   ```
   If missing, the API server crashed — check its log for errors (usually a missing `DATABASE_URL` secret).

3. **Hard-refresh the preview** — press **Ctrl+Shift+R** (Cmd+Shift+R on Mac) in the Replit preview pane.

4. **Check you're on the right port** — use the port selector at the top of the preview pane:
   - **PWA** (default preview): port `5000` — path `/`
   - **Admin Portal**: port `3002` — path `/admin-portal/`
   - Admin login: `admin` / `admin123`

### Install failed / workflows still crashing

If the auto-install guard failed for any reason, run this manually in the Shell tab:
```
pnpm install
```
Then restart all three workflows from the Workflows panel.

### Apps load but show no data / 500 errors

The API Server workflow is down. Restart it and wait for the `🚀 Backend Server running` log line before refreshing the frontend.

## Gotchas

- The `@xenova/transformers` + `@ffmpeg/*` packages are NOT installed (package firewall 403). They are shimmed via Vite aliases. If those video/ML features are needed, they must be replaced with environment-compatible alternatives.
- `is_debug_mode` and `is_usage_limit_enabled` columns on `payment_settings` are added via the auto-migration at startup (not in the initial `CREATE TABLE`). On first boot there may be a single 500 on `/api/payment-info` before the migration finishes.
- Do not run `pnpm dev` at the workspace root — use `restart_workflow` instead.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
