/**
 * Authenticated fetch wrapper for admin portal.
 * Automatically attaches the admin JWT token and redirects to /login
 * on 401 (expired/invalid token) or 403 (forbidden) responses.
 */

function getAdminBase(): string {
  return (import.meta.env.BASE_URL || "/admin-portal").replace(/\/$/, "");
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("admin_token");

  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("admin_token");
    window.location.href = `${getAdminBase()}/login`;
  }

  return response;
}
