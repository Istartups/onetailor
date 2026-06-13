# OneTailor Toolkit

A full-stack business tools platform for tailors (PWA) with an admin dashboard for managing users, licenses, payments, and settings.

## Run & Operate

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (provisioned), `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (proxied as `/api`)
- DB: PostgreSQL + Drizzle ORM (13 tables)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind + Wouter + Zustand + TanStack Query

## Where things live

- `artifacts/one-tailor/` — PWA for tailors (path `/` — default preview)
- `artifacts/admin-portal/` — Admin dashboard (path `/admin-portal/`)
- `artifacts/api-server/src/routes/` — Express route handlers (admin, license, payment, user, tailoring, notification)
- `lib/db/src/schema/index.ts` — Drizzle schema (source of truth for all 13 tables)
- `lib/api-spec/openapi.yaml` — OpenAPI spec

## Architecture decisions

- **Auto-migration at startup**: The API server (`artifacts/api-server/src/index.ts`) runs `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS` on boot so schema changes are applied without a separate migration step.
- **Blocked packages shimmed**: `@xenova/transformers`, `@ffmpeg/ffmpeg`, `@ffmpeg/util` are blocked by the package firewall. They are aliased in Vite to lightweight shims (`src/shims/`) so the build succeeds; video/ML pages gracefully degrade.
- **DB provisioned**: The PostgreSQL database is provisioned and `DATABASE_URL` is set via environment secrets.
- **Default admin**: Created on first server boot — username `admin`, password `admin123`.
- **Port routing via artifact system**: Replit's artifact system assigns each service its own external port via `PORT` env var. Vite configs read `process.env.PORT` so they bind to whatever port the artifact workflow sets. No manual port bridge is needed.

## Product

- **OneTailor PWA** (`/`): Customer management, body measurements, garment pricing advisor, payment collection, push notifications, business profile. Works offline via service worker.
- **Admin Portal** (`/admin-portal/`): Dashboard with user/license/payment management, settings configuration, analytics. Default login: `admin` / `admin123`.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

---

## GitHub Export & Import to a New Replit

When you export this project to GitHub and import it into a new Replit, follow these steps to get everything running on the first try.

### Step 1 — Set required secrets

The new environment will be missing these. Add them in the **Secrets** tab before pressing Run:

| Secret | What to put |
|--------|-------------|
| `DATABASE_URL` | Provision a new PostgreSQL database (Replit **Database** tab) and paste the connection string |
| `SESSION_SECRET` | Any long random string — run `openssl rand -hex 32` in the Shell to generate one |

The following secrets are auto-generated on first boot if missing — you do **not** need to set them manually:
`JWT_SECRET`, `USER_JWT_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

### Step 2 — Press Run

Replit will start all workflows automatically. Each workflow command includes an auto-install guard (`[ -f node_modules/.modules.yaml ] || pnpm install`) so `pnpm install` runs once if needed — no manual install step required.

### Step 3 — Wait for first boot (~60–90 seconds)

On first boot the install + Vite compile takes 60–90 seconds. Subsequent starts take ~5 seconds.

You will see 7 workflows start:

| Workflow | What it runs | When it's ready |
|----------|-------------|-----------------|
| `API Server` | Express API (legacy workflow) | Log shows `🚀 Backend Server running` |
| `Admin Portal` | Admin Portal Vite dev server | Log shows `VITE … ready` |
| `OneTailor PWA` | PWA Vite dev server | Log shows `VITE … ready` |
| `artifacts/api-server: API Server` | Express API (artifact workflow) | Log shows `🚀 Backend Server running` |
| `artifacts/admin-portal: web` | Admin Portal (artifact workflow) | Log shows `VITE … ready` |
| `artifacts/one-tailor: web` | PWA (artifact workflow) | Log shows `VITE … ready` |
| `artifacts/mockup-sandbox: Component Preview Server` | Canvas mockup sandbox | Log shows `VITE … ready` |

> The API server and frontends each have two workflow entries (legacy + artifact). Both run fine in parallel — the artifact workflows are what Replit's preview pane and canvas use.

### Step 4 — Open the previews

Use the preview pane at the top of the Replit editor:

- **PWA** — default preview, path `/`
- **Admin Portal** — path `/admin-portal/` — login: `admin` / `admin123`
- **API** — path `/api/payment-info` (health check)

### Step 5 — First-boot database migration

The API server auto-migrates all 13 tables on startup (`CREATE TABLE IF NOT EXISTS`). This happens automatically — no manual migration step needed.

---

## FIXLIVE — App Blank / Preview Not Showing

### Normal first-boot (fresh import)

Just press Run and wait ~90 seconds. If the preview is still blank after 2 minutes:

**1. Check all workflows are "Running"**

Go to the **Workflows** panel. All 7 workflows should show **Running** with log output. If any show no output or **Failed**, click Restart on them one by one.

The most important ones to check first:
- `artifacts/api-server: API Server` — must show `🚀 Backend Server running`
- `artifacts/one-tailor: web` — must show `VITE … ready`
- `artifacts/admin-portal: web` — must show `VITE … ready`

**2. Hard-refresh the preview**

Press **Ctrl+Shift+R** (Cmd+Shift+R on Mac) in the Replit preview pane to clear any cached 502 error.

**3. Check you're on the right path**

- **PWA**: default preview, path `/`
- **Admin Portal**: path `/admin-portal/`

### Port conflict on restart

If a workflow fails with `Error: Port XXXXX is already in use`, a previous instance is still running. Run this in the Shell tab to clear all stuck processes, then restart the affected workflow:

```bash
pkill -f "vite dev" 2>/dev/null; pkill -f "tsx.*index.ts" 2>/dev/null; echo "done"
```

### Install failed / workflows still crashing

If the auto-install guard failed, run this manually in the Shell tab:

```bash
pnpm install
```

Then restart all workflows from the Workflows panel.

### Apps load but show no data / 500 errors

The API Server workflow is down. Restart `artifacts/api-server: API Server` and wait for the `🚀 Backend Server running` log line before refreshing the frontend.

---

## Gotchas

- The `@xenova/transformers` + `@ffmpeg/*` packages are NOT installed (package firewall 403). They are shimmed via Vite aliases. If those video/ML features are needed, they must be replaced with environment-compatible alternatives.
- `is_debug_mode` and `is_usage_limit_enabled` columns on `payment_settings` are added via the auto-migration at startup (not in the initial `CREATE TABLE`). On first boot there may be a single 500 on `/api/payment-info` before the migration finishes — this resolves itself within a few seconds.
- Do not run `pnpm dev` at the workspace root — restart workflows individually instead.
- There is no port bridge script needed. Replit's artifact system sets `PORT` env vars for each workflow directly. If you see `scripts/port-bridge.cjs` in the repo, it is no longer used and can be ignored.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
