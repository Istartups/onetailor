import { useEffect, useState, useCallback } from "react";
import {
  Search, RefreshCw, MessageSquare, Phone, Star, UserCheck,
  Clock, CheckCircle, XCircle, AlertCircle, ChevronRight,
  Plus, Trash2, Edit2, X, Users, Flame, Thermometer,
  Snowflake, CalendarDays, Send, SlidersHorizontal,
  ClipboardList, Settings, MessageCircle, TrendingUp, UserPlus
} from "lucide-react";
import { authFetch, isAdmin } from "@/lib/authFetch";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: number;
  email: string | null;
  phone: string | null;
  businessName: string | null;
  whatsappNumber: string | null;
  isPremium: boolean;
  totalUsageCount: number;
  leadStatus: string;
  assignedAgentId: number | null;
  assignedAgentName: string | null;
  createdAt: string;
  lastSeen: string;
  computedScore: number;
  scoreLabel: "hot" | "warm" | "cold";
  accountStatus: string;
  premiumRequestStatus: string | null;
  customerCount: number;
  interactionCount: number;
  lastInteractionAt: string | null;
  toolsViewedList: string[];
  toolsUsedArray: string[];
  profile: { name: string; city: string | null; state: string | null } | null;
}

interface Interaction {
  id: number;
  userId: number;
  agentName: string | null;
  agentType: string;
  type: string;
  content: string;
  createdAt: string;
}

interface Template { id: number; name: string; content: string; createdAt: string; }
interface Agent { id: number; username: string; name: string; phone: string | null; isActive: boolean; createdAt: string; }
interface Task { id: number; userId: number; taskType: string; status: string; triggerAt: string; notes: string | null; user: { email: string | null; businessName: string | null; phone: string | null } | null; }
interface Stats { totalLeads: number; newToday: number; hotLeads: number; pendingFollowUps: number; converted: number; conversionRate: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEAD_STATUS_OPTIONS = ["new","contacted","interested","follow_up","converted","not_interested"] as const;
const STATUS_LABELS: Record<string, string> = {
  new: "New", contacted: "Contacted", interested: "Interested",
  follow_up: "Follow Up", converted: "Converted", not_interested: "Not Interested",
};
const STATUS_COLORS: Record<string, string> = {
  new: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  contacted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  interested: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  follow_up: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  converted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  not_interested: "bg-red-500/10 text-red-400 border-red-500/20",
};

function relDate(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "2-digit" });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function ScoreBadge({ score, label }: { score: number; label: string }) {
  if (label === "hot") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/25">
      <Flame size={10} /> Hot · {score}
    </span>
  );
  if (label === "warm") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
      <Thermometer size={10} /> Warm · {score}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/25">
      <Snowflake size={10} /> Cold · {score}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] || "bg-slate-500/10 text-slate-400 border-slate-500/20";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border ${cls}`}>{STATUS_LABELS[status] || status}</span>;
}

function InteractionIcon({ type }: { type: string }) {
  const props = { size: 12 };
  if (type === "whatsapp") return <MessageSquare {...props} className="text-green-400" />;
  if (type === "call") return <Phone {...props} className="text-blue-400" />;
  if (type === "email") return <Send {...props} className="text-purple-400" />;
  if (type === "system") return <Settings {...props} className="text-slate-400" />;
  if (type === "auto") return <Clock {...props} className="text-amber-400" />;
  return <ClipboardList {...props} className="text-primary" />;
}

function buildWAMessage(template: string, lead: Lead): string {
  const name = lead.profile?.name || lead.businessName || lead.email?.split("@")[0] || "there";
  return encodeURIComponent(template.replace(/\{\{name\}\}/g, name));
}

// ─── Stats Strip ──────────────────────────────────────────────────────────────

function StatsStrip({ stats }: { stats: Stats | null }) {
  const cards = [
    { label: "Total Leads", value: stats?.totalLeads ?? "—", icon: Users, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    { label: "New Today", value: stats?.newToday ?? "—", icon: UserPlus, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    { label: "Hot Leads", value: stats?.hotLeads ?? "—", icon: Flame, color: "text-red-400 bg-red-500/10 border-red-500/20" },
    { label: "Pending Tasks", value: stats?.pendingFollowUps ?? "—", icon: Clock, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    { label: "Converted", value: stats?.converted ?? "—", icon: CheckCircle, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    { label: "Conv. Rate", value: stats ? `${stats.conversionRate}%` : "—", icon: TrendingUp, color: "text-primary bg-primary/10 border-primary/20" },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
      {cards.map(c => (
        <div key={c.label} className="rounded-2xl p-3.5 flex flex-col gap-2" style={{ background: "hsl(218,44%,10%)", border: "1px solid hsl(218,38%,18%)" }}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${c.color}`}>
            <c.icon size={15} />
          </div>
          <div>
            <p className="text-lg font-black text-foreground leading-none">{String(c.value)}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mt-0.5">{c.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Lead Detail Panel ────────────────────────────────────────────────────────

function LeadDetailPanel({
  lead, agents, templates, onClose, onUpdated,
}: {
  lead: Lead;
  agents: Agent[];
  templates: Template[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(lead.leadStatus || "new");
  const [agentId, setAgentId] = useState<string>(String(lead.assignedAgentId || ""));
  const [waPhone, setWaPhone] = useState(lead.whatsappNumber || lead.phone || "");
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    authFetch(`/api/crm/leads/${lead.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.interactions) setInteractions(data.interactions); })
      .finally(() => setLoadingInteractions(false));
  }, [lead.id]);

  const updateLead = async (updates: Record<string, any>) => {
    await authFetch(`/api/crm/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    onUpdated();
  };

  const addInteraction = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/crm/leads/${lead.id}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: noteType, content: newNote.trim() }),
      });
      if (res.ok) {
        const interaction = await res.json();
        setInteractions(prev => [interaction, ...prev]);
        setNewNote("");
      }
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    await updateLead({ leadStatus: newStatus });
    const systemNote: Interaction = {
      id: Date.now(), userId: lead.id, agentName: null, agentType: "system",
      type: "system", content: `Status changed to "${STATUS_LABELS[newStatus]}"`,
      createdAt: new Date().toISOString(),
    };
    setInteractions(prev => [systemNote, ...prev]);
  };

  const handleAgentChange = async (val: string) => {
    setAgentId(val);
    await updateLead({ assignedAgentId: val ? parseInt(val) : null });
  };

  const displayName = lead.profile?.name || lead.businessName || lead.email?.split("@")[0] || "Unknown";
  const waNumber = (waPhone || lead.phone || "").replace(/\D/g, "");

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
        style={{ background: "hsl(218,44%,9%)", borderLeft: "1px solid hsl(218,38%,18%)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="font-black text-base truncate">{displayName}</h3>
            <p className="text-xs text-muted-foreground truncate">{lead.email || "No email"}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ScoreBadge score={lead.computedScore} label={lead.scoreLabel} />
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Contact info */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "hsl(218,44%,11%)", border: "1px solid hsl(218,38%,18%)" }}>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Lead Info</p>
            {[
              { label: "Phone", value: lead.phone },
              { label: "WhatsApp", value: lead.whatsappNumber },
              { label: "Business", value: lead.businessName },
              { label: "City", value: lead.profile?.city },
              { label: "Tools Used", value: lead.toolsUsedArray.length > 0 ? lead.toolsUsedArray.join(", ") : null },
              { label: "Tools Viewed", value: lead.toolsViewedList.length > 0 ? `${lead.toolsViewedList.length} tools` : null },
              { label: "Clients Added", value: lead.customerCount > 0 ? `${lead.customerCount} clients` : null },
              { label: "Signed Up", value: formatDate(lead.createdAt) },
              { label: "Last Active", value: relDate(lead.lastSeen) },
            ].filter(r => r.value).map(r => (
              <div key={r.label} className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground font-medium shrink-0">{r.label}</span>
                <span className="text-xs font-bold text-right truncate">{r.value}</span>
              </div>
            ))}
          </div>

          {/* WhatsApp quick-send */}
          {waNumber && (
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">WhatsApp</p>
              <div className="flex gap-2">
                <input
                  value={waPhone}
                  onChange={e => setWaPhone(e.target.value)}
                  placeholder="Phone number"
                  className="flex-1 px-3 py-2 rounded-xl text-sm bg-background border border-border outline-none"
                />
                <a
                  href={`https://wa.me/${waNumber}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25 transition-colors whitespace-nowrap"
                >
                  <MessageSquare size={13} /> Open WA
                </a>
              </div>
              {showTemplates ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground">Choose a template:</p>
                  {templates.map(t => (
                    <a
                      key={t.id}
                      href={`https://wa.me/${waNumber}?text=${buildWAMessage(t.content, lead)}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => setShowTemplates(false)}
                      className="block p-3 rounded-xl text-xs bg-background border border-border hover:border-green-500/40 transition-colors"
                    >
                      <p className="font-bold text-green-400">{t.name}</p>
                      <p className="text-muted-foreground mt-0.5 line-clamp-2">{t.content.replace(/\{\{name\}\}/g, displayName)}</p>
                    </a>
                  ))}
                  <button onClick={() => setShowTemplates(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowTemplates(true)}
                  className="text-xs font-bold text-green-400 hover:text-green-300 flex items-center gap-1">
                  <MessageCircle size={11} /> Use message template
                </button>
              )}
            </div>
          )}

          {/* Status + assignment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</label>
              <select
                value={status}
                onChange={e => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs font-bold bg-background border border-border outline-none"
              >
                {LEAD_STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            {isAdmin() && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assign Agent</label>
                <select
                  value={agentId}
                  onChange={e => handleAgentChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-bold bg-background border border-border outline-none"
                >
                  <option value="">Unassigned</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Add interaction */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Log Interaction</p>
            <select
              value={noteType}
              onChange={e => setNoteType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-xs font-bold bg-background border border-border outline-none"
            >
              <option value="note">📝 Note</option>
              <option value="call">📞 Call</option>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="email">📧 Email</option>
            </select>
            <textarea
              rows={3}
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add a note, log a call, or record what was discussed…"
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-background border border-border outline-none resize-none focus:border-primary/50 transition-colors"
            />
            <button
              onClick={addInteraction}
              disabled={!newNote.trim() || saving}
              className="w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: "hsl(43,82%,55%)", color: "hsl(218,44%,8%)" }}
            >
              {saving ? "Saving…" : "Save Interaction"}
            </button>
          </div>

          {/* Interaction timeline */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Interaction History ({interactions.length})
            </p>
            {loadingInteractions ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-t-transparent border-primary rounded-full animate-spin" />
              </div>
            ) : interactions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No interactions yet</p>
            ) : (
              <div className="space-y-2">
                {interactions.map(i => (
                  <div key={i.id} className="flex gap-3 p-3 rounded-xl" style={{ background: "hsl(218,44%,11%)", border: "1px solid hsl(218,38%,18%)" }}>
                    <div className="mt-0.5 shrink-0">
                      <InteractionIcon type={i.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-relaxed">{i.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {i.agentName || i.agentType} · {relDate(i.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Leads Tab ────────────────────────────────────────────────────────────────

const DATE_PRESETS = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
];

function getDateRange(preset: string): { dateFrom: string; dateTo: string } | {} {
  const now = new Date();
  if (preset === "today") {
    const d = now.toISOString().split("T")[0];
    return { dateFrom: d, dateTo: d };
  }
  if (preset === "yesterday") {
    const d = new Date(now.setDate(now.getDate() - 1)).toISOString().split("T")[0];
    return { dateFrom: d, dateTo: d };
  }
  if (preset === "7d") {
    const from = new Date(); from.setDate(from.getDate() - 7);
    return { dateFrom: from.toISOString().split("T")[0], dateTo: new Date().toISOString().split("T")[0] };
  }
  if (preset === "30d") {
    const from = new Date(); from.setDate(from.getDate() - 30);
    return { dateFrom: from.toISOString().split("T")[0], dateTo: new Date().toISOString().split("T")[0] };
  }
  return {};
}

function LeadsTab({ agents, templates }: { agents: Agent[]; templates: Template[] }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [includeConverted, setIncludeConverted] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (scoreFilter !== "all") params.set("scoreFilter", scoreFilter);
      if (includeConverted) params.set("includeConverted", "true");

      const dateRange = datePreset === "custom"
        ? (customFrom ? { dateFrom: customFrom, dateTo: customTo || customFrom } : {})
        : getDateRange(datePreset);

      Object.entries(dateRange).forEach(([k, v]) => params.set(k, v as string));

      const res = await authFetch(`/api/crm/leads?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setTotal(data.total || 0);
      }
    } finally { setLoading(false); }
  }, [search, statusFilter, scoreFilter, datePreset, customFrom, customTo, includeConverted]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-background border border-border outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm bg-background border border-border outline-none">
          <option value="all">All Status</option>
          {LEAD_STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>

        <select value={scoreFilter} onChange={e => setScoreFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm bg-background border border-border outline-none">
          <option value="all">All Scores</option>
          <option value="hot">🔥 Hot (70+)</option>
          <option value="warm">🌡️ Warm (40-69)</option>
          <option value="cold">🧊 Cold (&lt;40)</option>
        </select>

        <button onClick={() => setIncludeConverted(!includeConverted)}
          className={`px-3 py-2.5 rounded-xl text-sm font-bold border transition-colors ${includeConverted ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-muted-foreground"}`}>
          {includeConverted ? "✓ " : ""}Incl. Converted
        </button>

        <button onClick={fetchLeads} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm bg-background border border-border text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Date presets */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <CalendarDays size={14} className="text-muted-foreground shrink-0" />
        {DATE_PRESETS.map(p => (
          <button key={p.value} onClick={() => setDatePreset(p.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${datePreset === p.value ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-muted-foreground"}`}>
            {p.label}
          </button>
        ))}
        <button onClick={() => setDatePreset("custom")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${datePreset === "custom" ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-muted-foreground"}`}>
          Custom
        </button>
        {datePreset === "custom" && (
          <>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs bg-background border border-border outline-none" />
            <span className="text-xs text-muted-foreground">to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs bg-background border border-border outline-none" />
          </>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{total} leads</span>
      </div>

      {/* Leads table */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="w-6 h-6 border-2 border-t-transparent border-primary rounded-full animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No leads found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map(lead => {
            const displayName = lead.profile?.name || lead.businessName || lead.email?.split("@")[0] || "Unknown";
            const waNumber = (lead.whatsappNumber || lead.phone || "").replace(/\D/g, "");
            return (
              <div key={lead.id}
                className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer hover:border-primary/20 transition-all active:scale-[0.99]"
                style={{ background: "hsl(218,44%,10%)", border: "1px solid hsl(218,38%,18%)" }}
                onClick={() => setSelectedLead(lead)}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ background: lead.computedScore >= 70 ? "rgba(239,68,68,0.15)" : lead.computedScore >= 40 ? "rgba(245,158,11,0.15)" : "rgba(148,163,184,0.15)", color: lead.computedScore >= 70 ? "#f87171" : lead.computedScore >= 40 ? "#fbbf24" : "#94a3b8" }}>
                  {displayName.charAt(0).toUpperCase()}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold truncate">{displayName}</p>
                    <ScoreBadge score={lead.computedScore} label={lead.scoreLabel} />
                    <StatusBadge status={lead.leadStatus || "new"} />
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {lead.phone && <span className="text-xs text-muted-foreground">{lead.phone}</span>}
                    {lead.email && <span className="text-xs text-muted-foreground truncate">{lead.email}</span>}
                    <span className="text-[10px] text-muted-foreground">{relDate(lead.createdAt)}</span>
                    {lead.interactionCount > 0 && (
                      <span className="text-[10px] text-primary">{lead.interactionCount} interactions</span>
                    )}
                    {lead.totalUsageCount > 0 && (
                      <span className="text-[10px] text-muted-foreground">{lead.totalUsageCount} tool uses</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  {waNumber && (
                    <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors">
                      <MessageSquare size={14} />
                    </a>
                  )}
                  <button onClick={() => setSelectedLead(lead)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          agents={agents}
          templates={templates}
          onClose={() => setSelectedLead(null)}
          onUpdated={() => { fetchLeads(); setSelectedLead(null); }}
        />
      )}
    </div>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [generating, setGenerating] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/crm/tasks?status=${filter}`);
      if (res.ok) setTasks(await res.json());
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const updateTask = async (id: number, status: string) => {
    await authFetch(`/api/crm/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchTasks();
  };

  const generateTasks = async () => {
    setGenerating(true);
    try {
      const res = await authFetch("/api/crm/generate-tasks", { method: "POST" });
      if (res.ok) { const d = await res.json(); alert(d.message); fetchTasks(); }
    } finally { setGenerating(false); }
  };

  const taskTypeLabel: Record<string, string> = { "24h": "24-Hour Follow-Up", "48h": "48-Hour Follow-Up", "72h": "72-Hour Follow-Up" };
  const isOverdue = (t: Task) => t.status === "pending" && new Date(t.triggerAt) < new Date();

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {["pending", "completed", "dismissed", "all"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-2 rounded-xl text-sm font-bold border transition-colors capitalize ${filter === s ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-muted-foreground"}`}>
            {s}
          </button>
        ))}
        <button onClick={fetchTasks} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-background border border-border text-muted-foreground hover:text-foreground">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
        {isAdmin() && (
          <button onClick={generateTasks} disabled={generating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 ml-auto">
            <Plus size={13} /> {generating ? "Generating…" : "Generate Tasks"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-t-transparent border-primary rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No {filter === "all" ? "" : filter} tasks</p>
          {filter === "pending" && isAdmin() && (
            <p className="text-xs mt-2">Click "Generate Tasks" to create follow-up tasks for leads</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const overdue = isOverdue(task);
            const name = task.user?.businessName || task.user?.email?.split("@")[0] || `User #${task.userId}`;
            return (
              <div key={task.id} className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: overdue ? "rgba(239,68,68,0.06)" : "hsl(218,44%,10%)", border: `1px solid ${overdue ? "rgba(239,68,68,0.3)" : "hsl(218,38%,18%)"}` }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold">{name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold"
                      style={{ background: "rgba(212,160,32,0.1)", color: "hsl(43,82%,55%)", border: "1px solid rgba(212,160,32,0.2)" }}>
                      {taskTypeLabel[task.taskType] || task.taskType}
                    </span>
                    {overdue && <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-red-500/10 text-red-400 border border-red-500/20">OVERDUE</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {task.user?.phone && `${task.user.phone} · `}Trigger: {formatDate(task.triggerAt)}
                  </p>
                </div>
                {task.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => updateTask(task.id, "completed")}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                      <CheckCircle size={11} /> Done
                    </button>
                    <button onClick={() => updateTask(task.id, "dismissed")}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-muted/50 border border-border text-muted-foreground hover:text-foreground transition-colors">
                      <XCircle size={11} /> Skip
                    </button>
                  </div>
                )}
                {task.status !== "pending" && (
                  <span className={`text-xs font-bold px-2 py-1 rounded-xl border ${task.status === "completed" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-slate-500/10 border-slate-500/20 text-slate-400"}`}>
                    {task.status}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Templates Tab ────────────────────────────────────────────────────────────

function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/crm/templates");
      if (res.ok) setTemplates(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openEdit = (t: Template) => { setEditingId(t.id); setName(t.name); setContent(t.content); setShowForm(true); };
  const openNew = () => { setEditingId(null); setName(""); setContent(""); setShowForm(true); };

  const save = async () => {
    if (!name.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const res = editingId
        ? await authFetch(`/api/crm/templates/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, content }) })
        : await authFetch("/api/crm/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, content }) });
      if (res.ok) { setShowForm(false); fetchTemplates(); }
    } finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    await authFetch(`/api/crm/templates/${id}`, { method: "DELETE" });
    fetchTemplates();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm font-bold text-muted-foreground">Configure reusable WhatsApp message templates. Use <code className="bg-muted px-1 rounded text-[11px]">{"{{name}}"}</code> for the lead's name.</p>
        {isAdmin() && (
          <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors whitespace-nowrap">
            <Plus size={13} /> New Template
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-2xl p-5 mb-5 space-y-4" style={{ background: "hsl(218,44%,10%)", border: "1px solid hsl(218,38%,20%)" }}>
          <h4 className="font-bold text-sm">{editingId ? "Edit Template" : "New Template"}</h4>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Template name"
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border outline-none focus:border-primary/50" />
          <textarea rows={4} value={content} onChange={e => setContent(e.target.value)}
            placeholder={"Hello {{name}}, thank you for joining OneTailor..."}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border outline-none resize-none focus:border-primary/50" />
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
              style={{ background: "hsl(43,82%,55%)", color: "hsl(218,44%,8%)" }}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-muted/50 border border-border">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-t-transparent border-primary rounded-full animate-spin" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><MessageSquare size={32} className="mx-auto mb-3 opacity-30" /><p className="text-sm">No templates yet</p></div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="rounded-2xl p-4" style={{ background: "hsl(218,44%,10%)", border: "1px solid hsl(218,38%,18%)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-primary">{t.name}</p>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{t.content}</p>
                </div>
                {isAdmin() && (
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(t)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 size={13} /></button>
                    <button onClick={() => del(t.id)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Agents Tab ───────────────────────────────────────────────────────────────

function AgentsTab() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/agents");
      if (res.ok) setAgents(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAgents(); }, []);

  const create = async () => {
    if (!form.username || !form.password || !form.name) { setError("Username, password and name are required"); return; }
    setSaving(true); setError("");
    try {
      const res = await authFetch("/api/admin/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) { setShowForm(false); setForm({ username: "", password: "", name: "", phone: "" }); fetchAgents(); }
      else { const d = await res.json(); setError(d.message); }
    } finally { setSaving(false); }
  };

  const toggleActive = async (agent: Agent) => {
    await authFetch(`/api/admin/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !agent.isActive }),
    });
    fetchAgents();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm font-bold text-muted-foreground">Manage follow-up agents who can access the CRM and log interactions.</p>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors whitespace-nowrap">
          <UserPlus size={13} /> Add Agent
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl p-5 mb-5 space-y-4" style={{ background: "hsl(218,44%,10%)", border: "1px solid hsl(218,38%,20%)" }}>
          <h4 className="font-bold text-sm">New Follow-Up Agent</h4>
          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "name", label: "Full Name", placeholder: "Agent Name" },
              { key: "username", label: "Username", placeholder: "login-username" },
              { key: "password", label: "Password", placeholder: "secure password" },
              { key: "phone", label: "Phone (optional)", placeholder: "08012345678" },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{f.label}</label>
                <input
                  type={f.key === "password" ? "password" : "text"}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-background border border-border outline-none focus:border-primary/50"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: "hsl(43,82%,55%)", color: "hsl(218,44%,8%)" }}>
              {saving ? "Creating…" : "Create Agent"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-muted/50 border border-border">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-t-transparent border-primary rounded-full animate-spin" /></div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><UserCheck size={32} className="mx-auto mb-3 opacity-30" /><p className="text-sm">No agents yet</p></div>
      ) : (
        <div className="space-y-2">
          {agents.map(a => (
            <div key={a.id} className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: "hsl(218,44%,10%)", border: "1px solid hsl(218,38%,18%)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                {a.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{a.name}</p>
                <p className="text-xs text-muted-foreground">@{a.username}{a.phone ? ` · ${a.phone}` : ""}</p>
              </div>
              <button onClick={() => toggleActive(a)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${a.isActive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                {a.isActive ? "Active" : "Inactive"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main CRM Page ────────────────────────────────────────────────────────────

type Tab = "leads" | "tasks" | "templates" | "agents";

export default function CRM() {
  const [tab, setTab] = useState<Tab>("leads");
  const [stats, setStats] = useState<Stats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    authFetch("/api/crm/stats").then(r => r.ok ? r.json() : null).then(d => { if (d) setStats(d); });
    authFetch("/api/crm/templates").then(r => r.ok ? r.json() : []).then(setTemplates);
    if (isAdmin()) {
      authFetch("/api/admin/agents").then(r => r.ok ? r.json() : []).then(setAgents);
    }
  }, []);

  const TABS: { id: Tab; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
    { id: "leads",     label: "Leads",     icon: Users },
    { id: "tasks",     label: "Tasks",     icon: ClipboardList },
    { id: "templates", label: "Templates", icon: MessageSquare },
    { id: "agents",    label: "Agents",    icon: UserCheck, adminOnly: true },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black" style={{ color: "hsl(43,82%,55%)" }}>Lead CRM</h1>
        <p className="text-sm text-muted-foreground mt-1">Follow up pre-unlock leads and convert them to premium</p>
      </div>

      {/* Stats */}
      <StatsStrip stats={stats} />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-2xl w-fit" style={{ background: "hsl(218,44%,10%)", border: "1px solid hsl(218,38%,18%)" }}>
        {TABS.filter(t => !t.adminOnly || isAdmin()).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t.id ? "text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            style={tab === t.id ? { background: "hsl(218,44%,16%)", color: "hsl(43,82%,60%)" } : {}}>
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "leads" && <LeadsTab agents={agents} templates={templates} />}
      {tab === "tasks" && <TasksTab />}
      {tab === "templates" && <TemplatesTab />}
      {tab === "agents" && isAdmin() && <AgentsTab />}
    </div>
  );
}
