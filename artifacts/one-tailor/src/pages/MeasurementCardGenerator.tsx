import { useState, useEffect, useRef } from "react";
import { 
  Layout, Download, Share2, Printer, Check, X, Palette, 
  ChevronRight, Building2, User, Hash, Calendar, Copy,
  CreditCard, Banknote, ShieldCheck, Crown, Quote, MapPin,
  Users
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getDeviceId } from "@/lib/utils";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";

// --- Themes ---

const THEMES = [
  { id: "classic", label: "Classic White", bg: "bg-white", text: "text-slate-900", accent: "bg-slate-100", border: "border-slate-200" },
  { id: "tailor-blue", label: "Tailor Blue", bg: "bg-[#0f172a]", text: "text-white", accent: "bg-blue-500/10", border: "border-blue-500/20" },
  { id: "luxury-gold", label: "Luxury Gold", bg: "bg-black", text: "text-[#d4a020]", accent: "bg-[#d4a020]/10", border: "border-[#d4a020]/30" },
  { id: "corporate", label: "Corporate", bg: "bg-[#f1f5f9]", text: "text-[#1e293b]", accent: "bg-blue-600/10", border: "border-blue-600/20" },
  { id: "traditional", label: "Traditional", bg: "bg-[#fdfcf0]", text: "text-[#5d4037]", accent: "bg-[#5d4037]/10", border: "border-[#5d4037]/20" },
];

const DEFAULT_GLOBAL_NOTE = "Measurements remain valid until updated. Please present this card for your next order.";

export default function MeasurementCardGenerator() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1]);
  const initialCustomerId = searchParams.get("customerId");

  const businessProfile = useAppStore(s => s.businessProfile);
  const appLogo = useAppStore(s => s.appLogo);
  const appName = useAppStore(s => s.appName);
  const incrementUsage = useAppStore(s => s.incrementUsage);

  // Check if brand kit is complete
  const isProfileComplete = businessProfile && 
    businessProfile.name && 
    businessProfile.phone && 
    businessProfile.address;

  useEffect(() => {
    if (!isProfileComplete) {
      toast({
        title: "Profile Incomplete",
        description: "Please complete your business profile (Brand Kit) before generating cards.",
        variant: "destructive"
      });
      setLocation("/settings"); // Redirect to settings, not upgrade
    }
  }, [isProfileComplete, setLocation, toast]);

  // UI State
  const [step, setStep] = useState<"select_customer" | "select_record" | "customize">("select_customer");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState(THEMES[1]);
  const [customNote, setCustomNote] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  // Data State
  const [customers, setCustomers] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  useEffect(() => {
    fetchCustomers();
    if (initialCustomerId) {
      handleSelectCustomerById(parseInt(initialCustomerId));
    }
  }, [searchQuery]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`/api/tailoring/customers?deviceId=${getDeviceId()}&search=${encodeURIComponent(searchQuery)}`);
      if (res.ok) setCustomers(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleSelectCustomerById = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tailoring/customers?deviceId=${getDeviceId()}`);
      const list = await res.json();
      const found = list.find((c: any) => c.id === id);
      if (found) {
        setSelectedCustomer(found);
        const recRes = await fetch(`/api/tailoring/measurements/${id}`);
        const recList = await recRes.json();
        setRecords(recList);
        setStep("select_record");
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSelectRecord = (rec: any) => {
    setSelectedRecord(rec);
    setStep("customize");
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${selectedCustomer.name}-${selectedRecord.category}.png`;
      link.click();
      await incrementUsage();
      toast({ title: "Downloaded", description: "Card saved to your device." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to generate image.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const parseMeasurements = (valStr: string) => {
    try {
      let parsed = JSON.parse(valStr);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      return parsed || {};
    } catch (e) {
      return {};
    }
  };

  const inp = "w-full text-sm rounded-xl px-4 py-3 bg-card border border-border focus:border-primary/50 outline-none transition-all";

  return (
    <div className="max-w-xl mx-auto pb-24">
      <PageHeader 
        title="Card Generator" 
        subtitle="Create professional cards" 
        backPath="/customer-measurement"
      />

      <div className="px-4 py-4 space-y-6">
        {/* PROGRESS STEPS */}
        <div className="flex justify-between items-center px-6">
          {["Client", "Record", "Card"].map((s, i) => (
            <div key={s} className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all ${
                (i === 0 && step !== "select_customer") || (i === 1 && step === "customize") ? "bg-primary border-primary text-primary-foreground" : 
                (i === 0 && step === "select_customer") || (i === 1 && step === "select_record") || (i === 2 && step === "customize") ? "border-primary text-primary" : "border-muted text-muted-foreground"
              }`}>
                {i + 1}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-tighter">{s}</span>
            </div>
          ))}
        </div>

        {/* STEP 1: SELECT CUSTOMER */}
        {step === "select_customer" && (
          <div className="space-y-4">
            <div className="relative">
              <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                placeholder="Search customer..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`${inp} pl-11`}
              />
            </div>

            <div className="space-y-3">
              {customers.length === 0 ? (
                <div className="text-center py-20 bg-card border border-dashed border-border rounded-3xl">
                  <User size={40} className="mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground text-sm">No customers found</p>
                </div>
              ) : (
                customers.map(c => (
                  <div key={c.id} onClick={() => handleSelectCustomerById(c.id)} className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between cursor-pointer hover:border-primary/30 transition-all active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{c.name.charAt(0).toUpperCase()}</div>
                      <div>
                        <p className="font-bold text-sm">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.phone}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* STEP 2: SELECT RECORD */}
        {step === "select_record" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="font-bold text-sm">{selectedCustomer?.name}</h3>
                <p className="text-[10px] text-muted-foreground">Select a record to continue</p>
              </div>
              <button onClick={() => setStep("select_customer")} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Change Client</button>
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

                {/* Header */}
                <div className={`flex flex-col gap-4 pb-6 border-b ${theme.border}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-2xl overflow-hidden border ${theme.border} bg-white shrink-0 shadow-sm p-1`}>
                        <img src={appLogo || "/onetailor-logo.png"} className="w-full h-full object-contain" />
                      </div>
                      <div className="space-y-0.5">
                        <h2 className="text-xl font-black uppercase tracking-tight leading-tight">{businessProfile?.name || appName}</h2>
                        <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.15em]">{selectedRecord.category} Measurement</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] opacity-40 uppercase font-black tracking-widest">Client ID</p>
                       <p className="text-[11px] font-mono font-bold">#OT-{String(selectedCustomer.id).padStart(4, '0')}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-1 text-[10px] font-bold opacity-80">
                    <p className="flex items-center gap-2"><Banknote size={12} className="opacity-50" /> {businessProfile?.phone}</p>
                    <p className="flex items-center gap-2"><MapPin size={12} className="opacity-50" /> {businessProfile?.address}</p>
                    <p className="flex items-center gap-2"><User size={12} className="opacity-50" /> @{businessProfile?.name?.replace(/\s+/g, '').toLowerCase() || "onetailor"}</p>
                  </div>
                </div>

                {/* Client & Record Details */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[8px] opacity-40 uppercase font-black tracking-widest">Customer</p>
                    <h4 className="text-lg font-black leading-none">{selectedCustomer.name}</h4>
                    <p className="text-[11px] font-bold opacity-60">{selectedCustomer.phone}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[8px] opacity-40 uppercase font-black tracking-widest">Date Generated</p>
                    <p className="text-[11px] font-bold">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    <p className="text-[9px] opacity-60 font-bold uppercase">{selectedRecord.label}</p>
                  </div>
                </div>

                {/* Measurements Table */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-3 py-2">
                  {Object.entries(parseMeasurements(selectedRecord.values)).map(([k, v]) => (
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
