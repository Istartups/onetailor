/**
 * Authenticated fetch wrapper for admin portal.
 * Uses admin_token if present, falls back to agent_token.
 * Redirects to /login on 401/403 for admin, /agent-login for agent.
 */

function getAdminBase(): string {
  return (import.meta.env.BASE_URL || "/admin-portal").replace(/\/$/, "");
}

export function getActiveToken(): { token: string; role: "admin" | "agent" } | null {
  const adminToken = localStorage.getItem("admin_token");
  if (adminToken) return { token: adminToken, role: "admin" };
  const agentToken = localStorage.getItem("agent_token");
  if (agentToken) return { token: agentToken, role: "agent" };
  return null;
}

export function isAgent(): boolean {
  return !localStorage.getItem("admin_token") && !!localStorage.getItem("agent_token");
}

export function isAdmin(): boolean {
  return !!localStorage.getItem("admin_token");
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const active = getActiveToken();

  const headers = new Headers(init.headers);
  if (active) {
    headers.set("Authorization", `Bearer ${active.token}`);
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401 || response.status === 403) {
    if (active?.role === "agent") {
      localStorage.removeItem("agent_token");
      window.location.href = `${getAdminBase()}/agent-login`;
    } else {
      localStorage.removeItem("admin_token");
      window.location.href = `${getAdminBase()}/login`;
    }
  }

  return response;
}
