# OneTailor Toolkit — Setup Guide

## Prerequisites

- **Node.js 24+** (use `nvm install 24` if needed)
- **pnpm 9+** (`npm install -g pnpm`)
- **PostgreSQL** database (see "Database" below)

## Quick Start

```bash
pnpm install
```

Then start each service in a separate terminal (or use the Replit workflows):

```bash
# API server (port 8080)
pnpm --filter @workspace/api-server run dev

# OneTailor PWA (port 25497)
pnpm --filter @workspace/one-tailor run dev

# Admin Portal (port 25580)
pnpm --filter @workspace/admin-portal run dev
```

## Environment Variables

Copy `.env.example` to `.env` or set in your hosting environment:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (`postgresql://user:pass@host/db`) |
| `SESSION_SECRET` | ✅ | Random string ≥ 32 chars for session signing |

On Replit: add these in **Secrets** (the lock icon). They are automatically injected at runtime.

## Database

The API server **auto-migrates on boot** — no separate migration step needed.  
On first start it creates all tables and a default admin account:

- **Username**: `admin`  
- **Password**: `admin123`  
- Change this immediately after first login.

To manually push schema changes (dev only):

```bash
pnpm --filter @workspace/db run push
```

## Port Reference

| Service | Default Port | Path |
|---|---|---|
| API Server | `8080` | `/api/*` |
| OneTailor PWA | `25497` | `/` |
| Admin Portal | `25580` | `/admin-portal/` |

### Port Conflicts

If you see `EADDRINUSE` errors:

```bash
# Find what's using a port (e.g. 8080)
lsof -i :8080

# Kill it
kill -9 <PID>
```

Or change the port by setting the `PORT` env var before starting:

```bash
PORT=8081 pnpm --filter @workspace/api-server run dev
```

## Building for Production

```bash
pnpm run build
```

This runs typecheck + esbuild across all packages. Output: `artifacts/api-server/dist/index.js`.

## Useful Commands

```bash
# Full typecheck across all packages
pnpm run typecheck

# Regenerate API hooks from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Add a package to a specific workspace
pnpm --filter @workspace/one-tailor add <package>
```

## Architecture Notes

- **Auto-migration**: Schema changes are applied via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` at server startup.
- **Price units**: Stored in **Naira** (whole units). Paystack conversion (× 100 to kobo) happens only at payment initiation.
- **Shimmed packages**: `@xenova/transformers`, `@ffmpeg/ffmpeg`, `@ffmpeg/util` are blocked by the package firewall and are shimmed via Vite aliases. Video/ML features gracefully degrade.
- **Image storage**: Note and measurement images are stored as base64 in TEXT columns (compressed to JPEG 72%, max 900px before encoding).
