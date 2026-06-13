import { useState, useEffect, useMemo } from "react";
import {
  MessageSquareText, Mail, Phone, Send, Plus, Pencil, Trash2,
  X, Check, ChevronRight, Crown, Users, Search, CheckSquare, Square,
  ChevronDown, ChevronUp
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import { getDeviceId } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Channel = "whatsapp" | "sms" | "email";

interface MCCustomer {
  id: number;
  name: string;
  phone: string;
  email: string;
  gender: "male" | "female" | "others";
}

interface Template {
  id: string;
  title: string;
  body: string;
  subject?: string;
}

// ─── Default Templates ────────────────────────────────────────────────────────

const DEFAULT_TEMPLATES: Record<Channel, Template[]> = {
  whatsapp: [
    {
      id: "wa1",
      title: "Check-in",
      body: "Hello {name}! 😊 Just checking in from your tailor. Hope you're doing great! Feel free to reach out anytime.",
    },
    {
      id: "wa2",
      title: "Order Ready",
      body: "Hi {name}, great news! 🎉 Your order is ready for pickup. Please come in at your convenience. We can't wait for you to see it!",
    },
    {
      id: "wa3",
      title: "Seasonal Promo",
      body: "Dear {name}, we're running a special offer this season! 🧵 Bring a friend and enjoy a discount on your next order. Contact us for details.",
    },
  ],
  sms: [
    {
      id: "sms1",
      title: "Check-in",
      body: "Hi {name}, this is your tailor checking in. Hope all is well! Feel free to contact us anytime.",
    },
    {
      id: "sms2",
      title: "Order Ready",
      body: "Hi {name}, your order is ready for pickup. Please come in at your convenience. Thank you!",
    },
    {
      id: "sms3",
      title: "Appointment Reminder",
      body: "Hi {name}, reminder about your upcoming fitting. Please confirm your appointment. Thank you.",
    },
  ],
  email: [
    {
      id: "em1",
      title: "Order Ready",
      subject: "Your Order is Ready for Pickup",
      body: "Dear {name},\n\nWe're pleased to inform you that your order is now ready for pickup.\n\nPlease visit us at your earliest convenience.\n\nBest regards,\nYour Tailor",
    },
    {
      id: "em2",
      title: "Fitting Reminder",
      subject: "Fitting Appointment Reminder",
      body: "Dear {name},\n\nThis is a friendly reminder about your upcoming fitting appointment.\n\nPlease confirm your availability.\n\nBest regards,\nYour Tailor",
    },
    {
      id: "em3",
      title: "Special Offer",
      subject: "Exclusive Offer Just for You",
      body: "Dear {name},\n\nWe have an exclusive offer just for our valued customers!\n\nContact us today to find out more.\n\nBest regards,\nYour Tailor",
    },
  ],
};

const CHANNEL_META: Record<Channel, { label: string; color: string; bg: string; border: string; icon: React.FC<any> }> = {
  whatsapp: { label: "WhatsApp", color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)", icon: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#22c55e">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.134.558 4.134 1.535 5.867L0 24l6.335-1.66A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.655-.502-5.186-1.381l-.372-.221-3.863 1.013 1.032-3.764-.242-.389A9.937 9.937 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    </svg>
  )},
  sms: { label: "SMS", color: "#60a5fa", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.25)", icon: ({ size = 16 }) => <MessageSquareText size={size} color="#60a5fa" /> },
  email: { label: "Email", color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)", icon: ({ size = 16 }) => <Mail size={size} color="#a78bfa" /> },
};

function storageKey(channel: Channel) {
  return `mc_templates_${channel}_${getDeviceId()}`;
}

function loadTemplates(channel: Channel): Template[] {
  try {
    const raw = localStorage.getItem(storageKey(channel));
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_TEMPLATES[channel];
}

function saveTemplates(channel: Channel, templates: Template[]) {
  localStorage.setItem(storageKey(channel), JSON.stringify(templates));
}

function applyName(text: string, name: string) {
  return text.replace(/\{name\}/gi, name);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MessageCenter() {
  const isPremium = useAppStore(s => s.isPremium);
  const { toast } = useToast();

  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [templates, setTemplates] = useState<Record<Channel, Template[]>>({
    whatsapp: loadTemplates("whatsapp"),
    sms: loadTemplates("sms"),
    email: loadTemplates("email"),
  });
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [compose, setCompose] = useState("");
  const [subject, setSubject] = useState("");

  const [customers, setCustomers] = useState<MCCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectMode, setSelectMode] = useState<"all" | "select">("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showCustomers, setShowCustomers] = useState(false);
  const [sending, setSending] = useState(false);

  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editSubject, setEditSubject] = useState("");

  useEffect(() => {
    setLoading(true);
    const did = getDeviceId();
    fetch(`/api/tailoring/customers?deviceId=${did}&limit=9999`)
      .then(r => r.ok ? r.json() : [])
      .then((data: MCCustomer[]) => { setCustomers(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const reachable = useMemo(() => {
    if (channel === "email") return customers.filter(c => !!c.email);
    return customers.filter(c => !!c.phone);
  }, [customers, channel]);

  const filtered = useMemo(() =>
    reachable.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone || "").includes(search)),
  [reachable, search]);

  const targetCustomers = useMemo(() =>
    selectMode === "all" ? reachable : reachable.filter(c => selected.has(c.id)),
  [selectMode, reachable, selected]);

  const channelTemplates = templates[channel];

  function pickTemplate(t: Template) {
    setSelectedTemplate(t);
    setCompose(t.body);
    if (t.subject) setSubject(t.subject);
  }

  function openNewTemplate() {
    setEditingTemplate(null);
    setEditTitle("");
    setEditBody("");
    setEditSubject(channel === "email" ? "Subject" : "");
    setShowTemplateEditor(true);
  }

  function openEditTemplate(t: Template) {
    setEditingTemplate(t);
    setEditTitle(t.title);
    setEditBody(t.body);
    setEditSubject(t.subject || "");
    setShowTemplateEditor(true);
  }

  function saveTemplate() {
    if (!editTitle.trim() || !editBody.trim()) return;
    const updated = { ...templates };
    if (editingTemplate) {
      updated[channel] = updated[channel].map(t =>
        t.id === editingTemplate.id ? { ...t, title: editTitle.trim(), body: editBody.trim(), subject: editSubject.trim() || undefined } : t
      );
    } else {
      const newT: Template = {
        id: `${channel}_${Date.now()}`,
        title: editTitle.trim(),
        body: editBody.trim(),
        subject: editSubject.trim() || undefined,
      };
      updated[channel] = [...updated[channel], newT];
    }
    setTemplates(updated);
    saveTemplates(channel, updated[channel]);
    setShowTemplateEditor(false);
  }

  function deleteTemplate(id: string) {
    const updated = { ...templates };
    updated[channel] = updated[channel].filter(t => t.id !== id);
    setTemplates(updated);
    saveTemplates(channel, updated[channel]);
    if (selectedTemplate?.id === id) { setSelectedTemplate(null); setCompose(""); }
  }

  function toggleSelect(id: number) {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  }

  function sendOne(c: MCCustomer) {
    const msg = applyName(compose, c.name);
    if (channel === "whatsapp") {
      const phone = (c.phone || "").replace(/\D/g, "");
      if (!phone) return;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    } else if (channel === "sms") {
      const phone = (c.phone || "").replace(/\D/g, "");
      if (!phone) return;
      window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, "_blank");
    } else {
      if (!c.email) return;
      const sub = applyName(subject, c.name);
      window.open(`mailto:${c.email}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(msg)}`, "_blank");
    }
  }

  function sendAll() {
    if (!compose.trim() || targetCustomers.length === 0) return;
    setSending(true);
    targetCustomers.forEach((c, i) => setTimeout(() => sendOne(c), i * 700));
    setTimeout(() => {
      setSending(false);
      toast({ title: `Sending to ${targetCustomers.length} client${targetCustomers.length !== 1 ? "s" : ""}`, description: `Messages opening in ${CHANNEL_META[channel].label}` });
    }, targetCustomers.length * 700 + 200);
  }

  const meta = CHANNEL_META[channel];
  const Icon = meta.icon;
  const isProChannel = channel === "email";
  const locked = isProChannel && !isPremium;

  return (
    <div className="min-h-screen pb-24" style={{ background: "hsl(var(--background))" }}>
      <PageHeader title="Message Center" subtitle="Send messages to your clients" />

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">

        {/* ── Channel tabs ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          {(["whatsapp", "sms", "email"] as Channel[]).map(ch => {
            const m = CHANNEL_META[ch];
            const MI = m.icon;
            const active = channel === ch;
            const isPro = ch === "email";
            return (
              <button
                key={ch}
                onClick={() => { setChannel(ch); setSelectedTemplate(null); setCompose(""); setSubject(""); }}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border transition-all active:scale-[0.97]"
                style={active
                  ? { background: m.bg, borderColor: m.border, boxShadow: `0 0 12px ${m.bg}` }
                  : { background: "hsl(218,44%,11%)", borderColor: "hsl(218,38%,18%)" }}
              >
                <MI size={20} />
                <p className="text-[11px] font-black" style={{ color: active ? m.color : "hsl(218,20%,55%)" }}>{m.label}</p>
                {isPro && (
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{ background: "rgba(212,160,32,0.12)", color: "hsl(43,82%,55%)", border: "1px solid rgba(212,160,32,0.2)" }}>PRO</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Locked state for email on free ───────────────────────────────── */}
        {locked ? (
          <div className="rounded-3xl border p-8 text-center" style={{ background: "hsl(218,44%,11%)", borderColor: "hsl(218,38%,18%)" }}>
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ background: "rgba(212,160,32,0.1)", border: "1px solid rgba(212,160,32,0.2)" }}>
              <Crown size={24} style={{ color: "hsl(43,82%,55%)" }} />
            </div>
            <p className="text-base font-black mb-1">Email Messaging is Premium</p>
            <p className="text-xs text-muted-foreground mb-5 leading-relaxed">Upgrade to send professional emails directly to your clients' inboxes with custom templates.</p>
            <a href="/pre-unlock" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-black" style={{ background: "linear-gradient(135deg,hsl(43,82%,55%),hsl(43,90%,68%))" }}>
              <Crown size={14} />
              Unlock Premium
            </a>
          </div>
        ) : (
          <>
            {/* ── Reachable clients count ──────────────────────────────────── */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
              <Users size={13} style={{ color: meta.color }} />
              <p className="text-xs font-bold" style={{ color: meta.color }}>
                {loading ? "Loading clients…" : `${reachable.length} client${reachable.length !== 1 ? "s" : ""} reachable via ${meta.label}`}
              </p>
            </div>

            {/* ── Templates ────────────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(212,160,32,0.6)" }}>Templates</p>
                <button onClick={openNewTemplate} className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg active:scale-95 transition-all" style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
                  <Plus size={12} /> New
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {channelTemplates.map(t => (
                  <div
                    key={t.id}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl border cursor-pointer transition-all active:scale-[0.97] group relative"
                    style={selectedTemplate?.id === t.id
                      ? { background: meta.bg, borderColor: meta.border }
                      : { background: "hsl(218,44%,11%)", borderColor: "hsl(218,38%,18%)" }}
                    onClick={() => pickTemplate(t)}
                  >
                    <p className="text-[11px] font-bold whitespace-nowrap" style={{ color: selectedTemplate?.id === t.id ? meta.color : "hsl(218,20%,65%)" }}>{t.title}</p>
                    <button
                      onClick={e => { e.stopPropagation(); openEditTemplate(t); }}
                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil size={10} className="text-muted-foreground" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteTemplate(t.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={10} className="text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Compose area ─────────────────────────────────────────────── */}
            <div className="rounded-2xl border overflow-hidden" style={{ background: "hsl(218,44%,11%)", borderColor: "hsl(218,38%,18%)" }}>
              <div className="px-3 pt-3 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(212,160,32,0.6)" }}>Compose</p>
                {channel === "email" && (
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Subject…"
                    className="w-full bg-transparent text-sm font-bold outline-none border-b mb-2 pb-2"
                    style={{ borderColor: "hsl(218,38%,22%)", color: "hsl(43,25%,88%)" }}
                  />
                )}
                <textarea
                  value={compose}
                  onChange={e => setCompose(e.target.value)}
                  rows={4}
                  placeholder={`Type your message… Use {name} to personalise.`}
                  className="w-full bg-transparent text-sm outline-none resize-none"
                  style={{ color: "hsl(43,25%,88%)" }}
                />
              </div>
              <div className="px-3 pb-2 flex items-center justify-between">
                <p className="text-[9px] text-muted-foreground">{compose.length} chars · <span style={{ color: meta.color }}>{"{name}"}</span> = client name</p>
                <p className="text-[9px] text-muted-foreground">{compose.length > 0 && <button onClick={() => { setCompose(""); setSelectedTemplate(null); }} className="text-red-400 hover:text-red-300">Clear</button>}</p>
              </div>
            </div>

            {/* ── Recipients ───────────────────────────────────────────────── */}
            <div className="rounded-2xl border overflow-hidden" style={{ background: "hsl(218,44%,11%)", borderColor: "hsl(218,38%,18%)" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "hsl(218,38%,18%)" }}>
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-muted-foreground" />
                  <p className="text-xs font-black">Recipients</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {(["all", "select"] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setSelectMode(m)}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all"
                      style={selectMode === m
                        ? { background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }
                        : { color: "hsl(218,20%,50%)", border: "1px solid hsl(218,38%,18%)" }}
                    >
                      {m === "all" ? `All (${reachable.length})` : "Select"}
                    </button>
                  ))}
                </div>
              </div>

              {selectMode === "select" && (
                <div>
                  <div className="px-4 py-2 border-b" style={{ borderColor: "hsl(218,38%,18%)" }}>
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search clients…"
                        className="w-full pl-7 pr-3 py-1.5 rounded-xl text-xs outline-none bg-transparent border"
                        style={{ borderColor: "hsl(218,38%,22%)", color: "hsl(43,25%,88%)" }}
                      />
                    </div>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No reachable clients found.</p>
                    ) : (
                      filtered.map(c => (
                        <button
                          key={c.id}
                          onClick={() => toggleSelect(c.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 text-left active:bg-white/5 transition-colors"
                          style={{ borderColor: "hsl(218,38%,16%)" }}
                        >
                          {selected.has(c.id) ? <CheckSquare size={15} style={{ color: meta.color, shrink: 0 }} /> : <Square size={15} className="text-muted-foreground shrink-0" />}
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${c.gender === "female" ? "bg-pink-500/10 text-pink-400" : "bg-blue-500/10 text-blue-400"}`}>
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate" style={{ color: "hsl(43,25%,88%)" }}>{c.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{channel === "email" ? c.email : c.phone}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  {selected.size > 0 && (
                    <div className="px-4 py-2 border-t" style={{ borderColor: "hsl(218,38%,18%)" }}>
                      <p className="text-[10px] font-bold" style={{ color: meta.color }}>{selected.size} client{selected.size !== 1 ? "s" : ""} selected</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Send button ───────────────────────────────────────────────── */}
            <button
              onClick={sendAll}
              disabled={!compose.trim() || targetCustomers.length === 0 || sending || (channel === "email" && !subject.trim())}
              className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
              style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
            >
              <Icon size={16} />
              {sending ? "Opening messages…" : `Send via ${meta.label} to ${targetCustomers.length} client${targetCustomers.length !== 1 ? "s" : ""}`}
            </button>

            {/* ── Individual client quick-send ─────────────────────────────── */}
            {compose.trim() && reachable.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCustomers(v => !v)}
                  className="flex items-center gap-1.5 text-[10px] font-bold mb-2 transition-colors"
                  style={{ color: "rgba(212,160,32,0.6)" }}
                >
                  {showCustomers ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {showCustomers ? "Hide" : "Show"} client list — send individually
                </button>
                {showCustomers && (
                  <div className="space-y-2">
                    {reachable.map(c => (
                      <div key={c.id} className="flex items-center gap-3 p-3 rounded-2xl border" style={{ background: "hsl(218,44%,11%)", borderColor: "hsl(218,38%,18%)" }}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${c.gender === "female" ? "bg-pink-500/10 text-pink-400" : "bg-blue-500/10 text-blue-400"}`}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: "hsl(43,25%,88%)" }}>{c.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{channel === "email" ? c.email : c.phone}</p>
                        </div>
                        <button
                          onClick={() => sendOne(c)}
                          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                          style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
                        >
                          <Send size={12} style={{ color: meta.color }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Template Editor Modal ─────────────────────────────────────────────── */}
      {showTemplateEditor && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowTemplateEditor(false)}>
          <div className="bg-card w-full max-w-lg rounded-t-3xl border border-border border-b-0 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="px-5 pb-6 pt-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black">{editingTemplate ? "Edit Template" : "New Template"}</h3>
                <button onClick={() => setShowTemplateEditor(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/50"><X size={14} /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Template Name</p>
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="e.g. Order Ready"
                    className="w-full bg-muted/20 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50"
                  />
                </div>
                {channel === "email" && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Email Subject</p>
                    <input
                      value={editSubject}
                      onChange={e => setEditSubject(e.target.value)}
                      placeholder="e.g. Your Order is Ready"
                      className="w-full bg-muted/20 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50"
                    />
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Message Body</p>
                  <textarea
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    rows={5}
                    placeholder="Use {name} to insert the client's name"
                    className="w-full bg-muted/20 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 resize-none"
                  />
                  <p className="text-[9px] text-muted-foreground mt-1">Tip: <span className="font-bold text-primary">{"{name}"}</span> will be replaced with each client's name when sending.</p>
                </div>
              </div>
              <button
                onClick={saveTemplate}
                disabled={!editTitle.trim() || !editBody.trim()}
                className="w-full mt-4 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
              >
                <Check size={14} /> Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
