import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Crown, MessageSquare } from "lucide-react";

export default function AgentLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/agent/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Invalid credentials");
        return;
      }
      localStorage.setItem("agent_token", data.token);
      localStorage.removeItem("admin_token");
      setLocation("/crm");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "rgba(212,160,32,0.1)", border: "1px solid rgba(212,160,32,0.3)" }}>
            <MessageSquare size={24} style={{ color: "hsl(43,82%,55%)" }} />
          </div>
          <h1 className="text-2xl font-black" style={{ color: "hsl(43,82%,55%)" }}>Follow-Up Agent</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to manage your leads</p>
        </div>

        <div className="rounded-3xl p-6 space-y-4" style={{ background: "hsl(218,44%,10%)", border: "1px solid hsl(218,38%,18%)" }}>
          {error && (
            <div className="px-4 py-3 rounded-xl text-sm text-red-400 bg-red-500/10 border border-red-500/20">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="agent username"
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all bg-background border border-border focus:border-primary/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all bg-background border border-border focus:border-primary/50"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: "hsl(43,82%,55%)", color: "hsl(218,44%,8%)" }}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Admin?{" "}
          <a href="/admin-portal/login" className="text-primary hover:underline font-semibold">Sign in here</a>
        </p>
      </div>
    </div>
  );
}
