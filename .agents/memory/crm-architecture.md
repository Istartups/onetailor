---
name: CRM system architecture
description: Auth strategy, token storage, lead scoring formula, table layout, and agent role for OneTailor Lead CRM.
---

## Tables added
- `follow_up_agents` — agent accounts (username, password_hash, name, phone, is_active)
- `lead_interactions` — per-lead CRM log (user_id, agent_id, agent_type, type, content)
- `whatsapp_templates` — reusable WA message templates with {{name}} placeholders
- `follow_up_tasks` — auto-generated 24h/48h/72h follow-up queue entries

## New columns on existing tables
- `users`: whatsapp_number, lead_score, lead_status, assigned_agent_id, tools_viewed (JSON), tools_used_list (JSON)
- `payment_settings`: callmebot_phone, callmebot_api_key, followup_24h/48h/72h_enabled

## Auth strategy
- Admin JWT payload: `{ adminId }` signed with JWT_SECRET
- Agent JWT payload: `{ agentId, name, role: "agent" }` signed with same JWT_SECRET
- `authenticateCRM` middleware accepts both; sets `req.crmUserRole = "admin" | "agent"`
- `requireAdminRole` middleware blocks agents from admin-only routes
- Admin portal: admin_token in localStorage → full access; agent_token → CRM only
- `authFetch` tries admin_token first, falls back to agent_token
- `isAdmin()` / `isAgent()` helpers in `@/lib/authFetch`

## Lead scoring (computed in-memory, 0–100)
- Registered < 24h ago: +30, < 48h: +20, < 7d: +10
- Tool usage count × 5, max +40
- Has businessName: +10, phone: +10, email: +5
- Viewed pricing/profit tools: +15; any tool views: up to +10
- Has premium request (non-rejected): +20
- Payment status success: +30
- Has clients in DB: +20

Score labels: hot ≥ 70, warm ≥ 40, cold < 40

## Tool event tracking
- `POST /api/crm/events` — public endpoint, no auth needed
- PWA calls it fire-and-forget in `handleOpen` with `{ deviceId, toolId, eventType: "use" }`
- Appends toolId to `users.tools_viewed` and `users.tools_used_list` JSON arrays

## Agent login flow
- POST /api/agent/login → returns JWT with agentId
- Token stored as `agent_token` in localStorage (admin_token is cleared)
- AgentDashboard wrapper used when agent accesses /crm route
- CRM page shows agent management tab only when isAdmin()

## Follow-up tasks
- POST /api/crm/generate-tasks creates 24h/48h/72h tasks for all non-premium leads
- Tasks show in Tasks tab, can be completed/dismissed
- Respects followup_*_enabled settings from payment_settings

**Why:** Separate tokens with same signing key keeps infra simple while still allowing role-based access control at the middleware level.
