import React, { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  KeyRound,
  Table2,
  ShieldAlert,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";

type CheckStatus = "ok" | "warn" | "error";

interface Check {
  status: CheckStatus;
  message?: string;
  detail?: unknown;
}

interface HealthData {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  timestamp: string;
  freshInstall: boolean;
  checks: {
    database?: Check;
    secrets?: Check;
    tables?: Check;
    admin?: Check;
  };
}

function statusIcon(s: CheckStatus | undefined, size = 14) {
  if (s === "ok") return <CheckCircle2 size={size} className="text-emerald-500 shrink-0" />;
  if (s === "warn") return <AlertTriangle size={size} className="text-amber-400 shrink-0" />;
  return <XCircle size={size} className="text-red-500 shrink-0" />;
}

function statusDot(s: "healthy" | "degraded" | "unhealthy") {
  const colors = { healthy: "bg-emerald-500", degraded: "bg-amber-400", unhealthy: "bg-red-500" };
  return (
    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${colors[s]}`} />
  );
}

function formatUptime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

const CHECKS_META = [
  { key: "database" as const, label: "Database",  icon: Database },
  { key: "secrets"  as const, label: "Secrets",   icon: KeyRound },
  { key: "tables"   as const, label: "Tables",    icon: Table2 },
  { key: "admin"    as const, label: "Admin",     icon: ShieldAlert },
];

export default function SystemHealthBanner() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [setupDismissed, setSetupDismissed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data: HealthData = await res.json();
        setHealth(data);
        if (data.status !== "healthy") setExpanded(true);
      }
    } catch {
    } finally {
      setLoading(false);
      if (showSpinner) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const timer = setInterval(() => fetchHealth(), 30_000);
    return () => clearInterval(timer);
  }, [fetchHealth]);

  const dismissSetup = async () => {
    setSetupDismissed(true);
    try {
      await fetch("/api/health/dismiss-setup", { method: "POST" });
    } catch { }
  };

  if (loading || !health) return null;

  const showSetupAlert = health.freshInstall && !setupDismissed;
  const hasProblem = health.status !== "healthy";

  if (!hasProblem && !showSetupAlert) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground border-b border-border bg-background/50">
        {statusDot(health.status)}
        <span>All systems operational</span>
        <span className="ml-auto opacity-50">uptime {formatUptime(health.uptime)}</span>
        <button
          onClick={() => fetchHealth(true)}
          className="ml-1 hover:text-foreground transition-colors"
          title="Refresh health"
        >
          <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-border">
      {showSetupAlert && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
          <p className="text-xs font-medium text-amber-300 flex-1">
            <span className="font-bold">Fresh install detected.</span>{" "}
            Default admin credentials are active (<span className="font-mono">admin / admin123</span>).
            Change your password in{" "}
            <a
              href="../settings"
              className="underline hover:no-underline"
              onClick={(e) => { e.preventDefault(); window.location.hash = ""; window.location.pathname = window.location.pathname.replace(/\/?$/, "/settings"); }}
            >
              System Settings
            </a>{" "}
            before going live.
          </p>
          <button
            onClick={dismissSetup}
            className="text-amber-400/60 hover:text-amber-300 transition-colors ml-2"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {hasProblem && (
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-muted/40 transition-colors"
          >
            {statusDot(health.status)}
            <span className={`font-semibold ${health.status === "unhealthy" ? "text-red-400" : "text-amber-400"}`}>
              {health.status === "unhealthy" ? "System issue detected" : "System degraded"}
            </span>
            <span className="text-muted-foreground ml-1">— click to {expanded ? "hide" : "view"} details</span>
            <span className="ml-auto flex items-center gap-2 text-muted-foreground">
              <span>uptime {formatUptime(health.uptime)}</span>
              <button
                onClick={(e) => { e.stopPropagation(); fetchHealth(true); }}
                className="hover:text-foreground transition-colors"
                title="Refresh"
              >
                <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
              </button>
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </span>
          </button>

          {expanded && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border px-0">
              {CHECKS_META.map(({ key, label, icon: Icon }) => {
                const check = health.checks[key];
                return (
                  <div key={key} className="bg-background flex items-start gap-2.5 px-4 py-3">
                    {statusIcon(check?.status)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <Icon size={11} className="text-muted-foreground shrink-0" />
                        <span>{label}</span>
                      </div>
                      {check?.message && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight truncate" title={check.message}>
                          {check.message}
                        </p>
                      )}
                      {!check?.message && check?.status === "ok" && (
                        <p className="text-[10px] text-emerald-500/70 mt-0.5">Connected</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
