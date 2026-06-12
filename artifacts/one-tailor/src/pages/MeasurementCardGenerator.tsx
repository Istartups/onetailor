import { useState, useEffect, useRef } from "react";
import {
  Palette, Download, Printer, ShieldCheck, Users, ChevronRight,
  User, MapPin, Banknote, Quote, Ruler, RotateCcw
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { getDeviceId } from "@/lib/utils";
import html2canvas from "html2canvas";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Customer {
  id: number;
  name: string;
  phone: string;
  gender: string;
}

interface MeasurementRecord {
  id: number;
  customerId: number;
  label: string;
  category: string;
  values: string;
  unit?: string;
  createdAt: string;
}

type Step = "select_customer" | "select_record" | "customize";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_GLOBAL_NOTE =
  "All measurements are in the recorded unit. Please confirm before cutting.";

const THEMES = [
  { id: "dark",    label: "Classic Dark",   bg: "bg-slate-900",  text: "text-white",      border: "border-white/10",  accent: "text-amber-400" },
  { id: "light",   label: "Clean Light",    bg: "bg-white",      text: "text-slate-900",  border: "border-slate-200", accent: "text-indigo-600" },
  { id: "gold",    label: "Gold Luxury",    bg: "bg-amber-950",  text: "text-amber-50",   border: "border-amber-700/40", accent: "text-amber-400" },
  { id: "indigo",  label: "Indigo Pro",     bg: "bg-indigo-950", text: "text-indigo-50",  border: "border-indigo-700/40", accent: "text-indigo-300" },
  { id: "emerald", label: "Emerald Fresh",  bg: "bg-emerald-950",text: "text-emerald-50", border: "border-emerald-700/40", accent: "text-emerald-300" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMeasurements(raw: string): Record<string, string> {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, string>;
    return {};
  } catch {
    return {};
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MeasurementCardGenerator() {
  const [, setLocation] = useLocation();

  const appLogo         = useAppStore((s) => s.appLogo);
  const appName         = useAppStore((s) => s.appName);
  const businessProfile = useAppStore((s) => s.businessProfile);

  const [step, setStep]                       = useState<Step>("select_customer");
  const [customers, setCustomers]             = useState<Customer[]>([]);
  const [records, setRecords]                 = useState<MeasurementRecord[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedRecord, setSelectedRecord]   = useState<MeasurementRecord | null>(null);
  const [theme, setTheme]                     = useState(THEMES[0]);
  const [customNote, setCustomNote]           = useState("");
  const [loading, setLoading]                 = useState(false);
  const [search, setSearch]                   = useState("");

  const cardRef = useRef<HTMLDivElement>(null);

  // ── Fetch customers on mount ───────────────────────────────────────────────
  useEffect(() => {
    const deviceId = getDeviceId();
    fetch(`/api/tailoring/customers?deviceId=${deviceId}`)
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setCustomers(data) : setCustomers([]))
      .catch(() => setCustomers([]));
  }, []);

  // ── Fetch records when customer chosen ────────────────────────────────────
  useEffect(() => {
    if (!selectedCustomer) return;
    fetch(`/api/tailoring/measurements/${selectedCustomer.id}`)
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setRecords(data) : setRecords([]))
      .catch(() => setRecords([]));
  }, [selectedCustomer]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setSelectedRecord(null);
    setStep("select_record");
  };

  const handleSelectRecord = (r: MeasurementRecord) => {
    setSelectedRecord(r);
    setStep("customize");
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: null });
      const link = document.createElement("a");
      link.download = `${selectedCustomer?.name || "client"}-measurements.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setLoading(false);
    }
  };

  const onBack = () => {
    if (step === "customize")      return setStep("select_record");
    if (step === "select_record")  return setStep("select_customer");
    setLocation("/all-tools");
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const IMAGE_FIELDS = ["image", "styleimage", "photo", "designimage", "referenceimage"];

  const allEntries = selectedRecord ? Object.entries(parseMeasurements(selectedRecord.values)) : [];

  const previewImageUrl: string | null = (() => {
    for (const [k, v] of allEntries) {
      if (IMAGE_FIELDS.includes(k.toLowerCase()) && typeof v === "string" && v.startsWith("http")) return v;
    }
    return null;
  })();

  const entries = allEntries.filter(([k, v]) => {
    if (IMAGE_FIELDS.includes(k.toLowerCase())) return false;
    if (typeof v === "string" && (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("data:image"))) return false;
    return true;
  });

  const socials = businessProfile?.socials;
  const socialLine = [
    socials?.instagram ? `Instagram: @${socials.instagram}` : null,
    socials?.whatsapp  ? `WhatsApp: ${socials.whatsapp}` : null,
    socials?.facebook  ? `Facebook: ${socials.facebook}` : null,
    socials?.tiktok    ? `TikTok: @${socials.tiktok}` : null,
    socials?.youtube   ? `YouTube: ${socials.youtube}` : null,
  ].filter(Boolean).join(" | ");

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-xl mx-auto pb-24 relative min-h-screen">

      <PageHeader
        title={step === "select_customer" ? "Select Client" : step === "select_record" ? "Select Measurement" : "Card Preview"}
        subtitle={step === "select_customer" ? "Choose a client to generate their card" : ""}
        onBack={onBack}
      />

      <div className="px-4 py-4 space-y-6">

        {/* STEP 1: SELECT CUSTOMER */}
        {step === "select_customer" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="relative">
              <input
                placeholder="Search clients..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-card border border-border outline-none focus:border-primary text-sm font-medium"
              />
            </div>

            <div className="space-y-3">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-20 bg-card border border-dashed border-border rounded-3xl">
                  <Ruler size={40} className="mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground text-sm">No customers found</p>
                  <button onClick={() => setLocation("/customer-measurement")} className="mt-4 text-xs font-bold text-primary">Add your first client</button>
                </div>
              ) : filteredCustomers.map(c => (
                <div
                  key={c.id}
                  onClick={() => handleSelectCustomer(c)}
                  className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between cursor-pointer hover:border-primary/30 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{c.name}</h4>
                      <p className="text-[10px] text-muted-foreground">{c.phone}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: SELECT RECORD */}
        {step === "select_record" && selectedCustomer && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-xs text-muted-foreground">Client</p>
                <p className="font-black text-sm">{selectedCustomer.name}</p>
              </div>
              <button onClick={() => setStep("select_customer")} className="text-xs font-bold text-primary hover:underline">Change Client</button>
            </div>

            <div className="space-y-3">
              {records.map(r => (
                <div key={r.id} onClick={() => handleSelectRecord(r)} className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between cursor-pointer hover:border-primary/30 transition-all active:scale-[0.98]">
                  <div>
                    <p className="font-bold text-sm">{r.label}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{r.category}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              ))}
              {records.length === 0 && (
                <div className="text-center py-20 bg-card border border-dashed border-border rounded-3xl">
                  <p className="text-muted-foreground text-sm">No measurements recorded for this client.</p>
                  <button onClick={() => setLocation("/customer-measurement")} className="mt-4 text-xs font-bold text-primary">Go to Customer Measurement</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: CUSTOMIZE & GENERATE */}
        {step === "customize" && selectedCustomer && selectedRecord && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* THEME SELECTOR */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Palette size={14} className="text-primary" />
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Choose Theme</label>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {THEMES.map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => setTheme(t)}
                    className={`shrink-0 px-4 py-2.5 rounded-xl border text-[10px] font-bold transition-all ${theme.id === t.id ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-card border-border text-muted-foreground'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PREVIEW CARD */}
            <div className="p-1 bg-slate-200 dark:bg-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
              <div ref={cardRef} className={`w-full ${theme.bg} ${theme.text} p-8 space-y-8 transition-colors relative`}>
                {/* Branding Background Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] pointer-events-none">
                  <img src={appLogo || "/onetailor-logo.png"} className="w-full h-full object-contain" />
                </div>

                {/* ── 3-COLUMN HEADER ── */}
                <div className={`pb-5 border-b ${theme.border}`}>
                  <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-start">

                    {/* Col 1 — Logo */}
                    <div className={`w-16 h-16 rounded-2xl overflow-hidden border ${theme.border} bg-white shrink-0 shadow-sm p-1`}>
                      <img src={appLogo || "/onetailor-logo.png"} className="w-full h-full object-contain" />
                    </div>

                    {/* Col 2 — Business Info */}
                    <div className="min-w-0 space-y-1">
                      <h2 className="text-lg font-black uppercase tracking-tight leading-tight truncate">
                        {businessProfile?.name || appName}
                      </h2>
                      {businessProfile?.phone && (
                        <p className="text-[10px] font-bold opacity-70 flex items-center gap-1">
                          <Banknote size={10} className="opacity-50 shrink-0" />
                          {businessProfile.phone}
                        </p>
                      )}
                      {businessProfile?.address && (
                        <p className="text-[10px] font-bold opacity-70 flex items-start gap-1">
                          <MapPin size={10} className="opacity-50 shrink-0 mt-0.5" />
                          <span className="leading-tight">{businessProfile.address}</span>
                        </p>
                      )}
                      {socialLine && (
                        <p className="text-[9px] font-bold opacity-50 leading-relaxed pt-0.5">
                          {socialLine}
                        </p>
                      )}
                    </div>

                    {/* Col 3 — Client ID */}
                    <div className="text-right shrink-0">
                      <p className="text-[8px] opacity-40 uppercase font-black tracking-widest">Client ID</p>
                      <p className="text-[13px] font-mono font-black mt-0.5">
                        #OT-{String(selectedCustomer.id).padStart(4, '0')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── MEASUREMENT TITLE (full-width, below header) ── */}
                <div className={`py-3 border-b ${theme.border}`}>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-center opacity-80">
                    {selectedRecord.category} — {selectedRecord.label}
                  </p>
                </div>

                {/* ── CLIENT & DATE ROW ── */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-0.5">
                    <p className="text-[8px] opacity-40 uppercase font-black tracking-widest">Customer</p>
                    <h4 className="text-base font-black leading-none">{selectedCustomer.name}</h4>
                    <p className="text-[11px] font-bold opacity-60">{selectedCustomer.phone}</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-[8px] opacity-40 uppercase font-black tracking-widest">Date Generated</p>
                    <p className="text-[11px] font-bold">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>

                {/* ── STYLE IMAGE PREVIEW (if any) ── */}
                {previewImageUrl && (
                  <div className={`rounded-2xl overflow-hidden border ${theme.border} shadow-sm`}>
                    <img
                      src={previewImageUrl}
                      alt="Style Reference"
                      className="w-full object-cover max-h-52"
                      crossOrigin="anonymous"
                    />
                    <div className={`px-3 py-1.5 border-t ${theme.border}`}>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40 text-center">Style Reference</p>
                    </div>
                  </div>
                )}

                {/* ── MEASUREMENTS TABLE ── */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-3 py-2">
                  {entries.map(([k, v]) => (
                    <div key={k} className={`flex justify-between items-baseline border-b ${theme.border} pb-1.5`}>
                      <span className="text-[10px] font-bold opacity-50 uppercase tracking-tight">{k}</span>
                      <span className="text-base font-black">
                        {v as string}{selectedRecord.unit === 'CM' ? 'cm' : '"'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className={`pt-6 border-t ${theme.border} text-center space-y-3`}>
                  <p className="text-[10px] font-semibold leading-relaxed italic opacity-80 px-4">
                    {customNote || DEFAULT_GLOBAL_NOTE}
                  </p>
                  <div className="flex flex-col items-center gap-1 pt-2">
                    <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-30">Generated By OneTailor</p>
                    <p className="text-[7px] font-bold opacity-20 uppercase">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="space-y-5">
               <div>
                  <div className="flex items-center gap-2 px-1 mb-1.5">
                    <Quote size={14} className="text-primary" />
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Card Note (Optional)</label>
                  </div>
                  <textarea 
                    placeholder="Enter a custom instruction for this client..." 
                    value={customNote}
                    onChange={e => setCustomNote(e.target.value)}
                    className="w-full text-sm rounded-2xl px-4 py-3 bg-card border border-border focus:border-primary/50 outline-none min-h-[80px]"
                  />
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleDownload} 
                    disabled={loading}
                    className="h-14 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {loading ? "Generating..." : <><Download size={20} /> Save To Device</>}
                  </button>
                  <button 
                    onClick={() => window.print()} 
                    className="h-14 bg-card border border-border rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-muted transition-colors active:scale-[0.98]"
                  >
                    <Printer size={20} /> Print Card
                  </button>
               </div>

               <Button 
                 onClick={() => setLocation("/invite")}
                 variant="outline"
                 className="w-full h-14 rounded-2xl border-primary/20 bg-primary/5 hover:bg-primary/10 font-bold text-primary transition-all"
               >
                 <Users className="w-5 h-5 mr-2" />
                 Invite Another Tailor
               </Button>

               <div className="flex flex-col gap-3 items-center pt-2">
                 <button onClick={() => setStep("select_record")} className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors">Back to Records</button>
                 <div className="flex items-center gap-2 opacity-30">
                   <div className="h-px w-8 bg-muted-foreground" />
                   <ShieldCheck size={12} />
                   <div className="h-px w-8 bg-muted-foreground" />
                 </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
