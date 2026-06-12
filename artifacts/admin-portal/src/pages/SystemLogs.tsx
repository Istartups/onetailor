import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/authFetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, RefreshCw, CheckCircle2, XCircle, LogIn,
  FileText, ChevronDown, Loader2, Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

type LogType = "all" | "login" | "audit";

interface LogEntry {
  id: number;
  log_type: "login" | "audit";
  actor_type: string;
  username: string | null;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  failure_reason: string | null;
  action?: string;
  entity_type?: string;
  details?: string;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function uaShort(ua: string | null) {
  if (!ua) return "—";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return ua.slice(0, 30);
}

export default function SystemLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<LogType>("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();
  const LIMIT = 50;

  const fetchLogs = useCallback(async (reset = false) => {
    setLoading(true);
    const currentOffset = reset ? 0 : offset;
    try {
      const res = await authFetch(`/api/admin/system-logs?type=${typeFilter}&limit=${LIMIT}&offset=${currentOffset}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const newLogs: LogEntry[] = data.logs || [];
      if (reset) {
        setLogs(newLogs);
        setOffset(newLogs.length);
      } else {
        setLogs(prev => [...prev, ...newLogs]);
        setOffset(currentOffset + newLogs.length);
      }
      setHasMore(newLogs.length === LIMIT);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not load system logs." });
    } finally {
      setLoading(false);
    }
  }, [typeFilter, offset, toast]);

  useEffect(() => { fetchLogs(true); }, [typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (f: LogType) => { setTypeFilter(f); setOffset(0); };

  const filterBtns: { label: string; value: LogType }[] = [
    { label: "All Events", value: "all" },
    { label: "Login Audit", value: "login" },
    { label: "Admin Actions", value: "audit" },
  ];

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Login attempts, admin actions, and security events.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchLogs(true)}
          disabled={loading}
          className="rounded-2xl h-10 gap-2 font-bold"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Filter size={16} className="text-muted-foreground self-center" />
        {filterBtns.map(f => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
              typeFilter === f.value
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                : "bg-muted/30 border-border text-muted-foreground hover:border-primary/30"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Events", value: logs.length, icon: FileText, color: "text-blue-500" },
          { label: "Successful Logins", value: logs.filter(l => l.log_type === "login" && l.success).length, icon: CheckCircle2, color: "text-green-500" },
          { label: "Failed Logins", value: logs.filter(l => l.log_type === "login" && !l.success).length, icon: XCircle, color: "text-red-500" },
          { label: "Admin Actions", value: logs.filter(l => l.log_type === "audit").length, icon: Shield, color: "text-amber-500" },
        ].map(s => (
          <Card key={s.label} className="rounded-2xl border-none shadow-md bg-card">
            <CardContent className="p-5 flex items-center gap-3">
              <div className={cn("p-2.5 rounded-xl bg-muted/30", s.color.replace("text-", "bg-").replace("500", "500/10"))}>
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Log table */}
      <Card className="rounded-3xl border-none shadow-2xl bg-card overflow-hidden">
        <CardHeader className="border-b border-border px-6 py-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield size={16} className="text-primary" />
            Event Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground text-sm">
              No log entries found.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map(log => (
                <div key={`${log.log_type}-${log.id}`} className="flex items-start gap-3 px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className={cn(
                    "mt-0.5 p-2 rounded-xl shrink-0",
                    log.log_type === "login"
                      ? log.success ? "bg-green-500/10" : "bg-red-500/10"
                      : "bg-amber-500/10"
                  )}>
                    {log.log_type === "login"
                      ? log.success
                        ? <LogIn size={14} className="text-green-500" />
                        : <XCircle size={14} className="text-red-500" />
                      : <Shield size={14} className="text-amber-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">
                        {log.log_type === "login"
                          ? log.success ? "Login Success" : "Login Failed"
                          : log.action || "Admin Action"
                        }
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                        log.log_type === "login"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-amber-500/10 text-amber-600"
                      )}>
                        {log.log_type}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {log.username && (
                        <span className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">{log.username}</span>
                        </span>
                      )}
                      {log.ip_address && (
                        <span className="text-xs text-muted-foreground font-mono">{log.ip_address}</span>
                      )}
                      {log.user_agent && (
                        <span className="text-xs text-muted-foreground">{uaShort(log.user_agent)}</span>
                      )}
                      {log.failure_reason && (
                        <span className="text-xs text-red-500 font-medium">{log.failure_reason}</span>
                      )}
                      {log.entity_type && (
                        <span className="text-xs text-muted-foreground">{log.entity_type}</span>
                      )}
                      {log.details && (
                        <span className="text-xs text-muted-foreground truncate max-w-xs">{log.details}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 font-mono mt-1">
                    {formatDate(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {hasMore && !loading && (
            <div className="p-4 flex justify-center border-t border-border">
              <Button
                variant="outline"
                onClick={() => fetchLogs(false)}
                className="rounded-xl gap-2 font-bold text-sm"
              >
                <ChevronDown size={14} /> Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
