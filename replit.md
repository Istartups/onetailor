# OneTailor Toolkit

A full-stack business tools platform for tailors (PWA) with an admin dashboard for managing users, licenses, payments, and settings.

---

## First-time import (GitHub → new Replit)

Think of it like installing fresh software on a new PC — you get a clean slate, no old data needed.

### Two steps to a running app

**Step 1 — Add the database**

Click the **Database** tab in the Replit sidebar and provision a new PostgreSQL database. Replit sets `DATABASE_URL` automatically — you don't type anything.

**Step 2 — Press Run**

That's it. Everything else is automatic:
- `pnpm install` runs itself if packages are missing
- All security secrets are auto-generated and saved to the new database on first boot
- All 13 database tables are created automatically
- Default admin account is created: `admin` / `admin123`

Wait ~60–90 seconds on first boot (install + Vite compile). After that, starts in ~5 seconds.

### Where to find your apps

| App | Path | Notes |
|-----|------|-------|
| **OneTailor PWA** | `/` (default preview) | Tailor toolkit |
| **Admin Portal** | `/admin-portal/` | Login: `admin` / `admin123` |

---

## Workflows

All 7 workflows start automatically. The ones you interact with daily:

| Workflow | Purpose |
|----------|---------|
| `artifacts/one-tailor: web` | PWA — what tailors use |
| `artifacts/admin-portal: web` | Admin dashboard |
| `artifacts/api-server: API Server` | Backend API |

The three legacy workflows (`API Server`, `Admin Portal`, `OneTailor PWA`) run in parallel alongside the artifact ones — this is normal.

---

## If the preview is blank after 2 minutes

**1. Check the Database is provisioned**
The only thing that can stop first boot is a missing database. Go to the **Database** tab in the sidebar — if it says "Add Database", click it and wait for it to provision, then restart the workflows.

**2. Check all workflows are Running**
Open the Workflows panel. If any show **Failed**, click Restart on them one at a time.

**3. Hard-refresh**
Press **Ctrl+Shift+R** (or Cmd+Shift+R on Mac) in the preview pane to clear any cached error.

**4. Port conflict after a crash**
If a workflow fails with `Port XXXXX is already in use`, clear stuck processes from the Shell tab:
```bash
pkill -f "vite dev" 2>/dev/null; pkill -f "tsx.*index.ts" 2>/dev/null; echo done
```
Then restart the failed workflows.

---

## Development

```bash
pnpm run typecheck                        # typecheck all packages
pnpm run build                            # typecheck + build all
pnpm --filter @workspace/api-spec run codegen   # regenerate API hooks from OpenAPI spec
pnpm --filter @workspace/db run push      # push schema changes (dev only)
```

## Stack

- pnpm workspaces · Node.js 24 · TypeScript 5.9
- API: Express 5 · DB: PostgreSQL + Drizzle ORM (13 tables)
- Validation: Zod v4 · API codegen: Orval
- Frontend: React + Vite + Tailwind + Wouter + Zustand + TanStack Query

## Where things live

- `artifacts/one-tailor/` — PWA source
- `artifacts/admin-portal/` — Admin portal source
- `artifacts/api-server/src/routes/` — Express route handlers
- `lib/db/src/schema/index.ts` — Drizzle schema (source of truth)
- `lib/api-spec/openapi.yaml` — OpenAPI spec

## Architecture notes

- **Secrets are self-healing**: `JWT_SECRET`, `SESSION_SECRET`, `USER_JWT_SECRET`, and VAPID keys are auto-generated on first boot and stored in the database. No manual secret setup needed.
- **Schema is self-healing**: The API server runs `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS` on every boot. No migration commands needed.
- **Ports are dynamic**: Vite configs read `process.env.PORT` so each workflow binds to whatever port Replit assigns. No hardcoded ports.
- **Shimmed packages**: `@xenova/transformers`, `@ffmpeg/ffmpeg`, `@ffmpeg/util` are blocked by Replit's package firewall. They're aliased to lightweight shims so the build succeeds; those features degrade gracefully.

## User preferences

_Populated as needed — explicit instructions worth remembering across sessions._
