import { useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import {
  Search, Star, Crown, ChevronRight, Grid3X3, Clock, ArrowRight,
  ShieldCheck, X, ExternalLink, Users, Ruler, LayoutGrid,
  ChevronDown, MoreHorizontal
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { ALL_TOOLS, CATEGORY_LABELS, type ToolCategory, getToolById } from "@/lib/tools";
import { PremiumStatusBanner } from "@/components/PremiumStatusBanner";
import { getDeviceId } from "@/lib/utils";

const CATEGORIES: { id: ToolCategory; emoji: string }[] = [
  { id: "clients",      emoji: "👥" },
  { id: "measurements", emoji: "📏" },
  { id: "fabric",       emoji: "🧵" },
  { id: "pricing",      emoji: "💰" },
];

interface HomeCustomer {
  id: number;
  name: string;
  phone: string;
  gender: "male" | "female" | "others";
}

interface RecentMeasurement {
  id: number;
  customerId: number;
  customerName: string | null;
  label: string;
  category: string;
  createdAt: string;
}

function relativeDate(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7)  return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function genderDot(g: string) {
  return g === "female" ? "bg-pink-500" : g === "male" ? "bg-blue-500" : "bg-purple-500";
}

function ToolRow({ toolId, onClick, isFav, onFav }: { toolId: string; onClick: () => void; isFav: boolean; onFav: () => void }) {
  const tool = getToolById(toolId);
  if (!tool) return null;
  const Icon = tool.icon;
  return (
    <div className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl active:scale-[0.98] transition-all"
      style={{ background: "linear-gradient(135deg, hsl(218,44%,11%) 0%, hsl(218,40%,12%) 100%)", border: `1px solid ${tool.borderColor}` }}>
      <button onClick={onClick} className="flex items-center gap-3.5 flex-1 min-w-0 text-left">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: tool.iconBg, border: `1px solid ${tool.borderColor}` }}>
          <Icon size={20} strokeWidth={2} style={{ color: tool.iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-sm" style={{ color: "hsl(43,25%,90%)" }}>{tool.name}</p>
            {tool.premium && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "rgba(212,160,32,0.15)", color: "hsl(43,82%,58%)", border: "1px solid rgba(212,160,32,0.2)" }}>PREMIUM</span>}
            {tool.isNew && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "rgba(74,222,128,0.12)", color: "hsl(142,65%,55%)", border: "1px solid rgba(74,222,128,0.2)" }}>NEW</span>}
          </div>
          <p className="text-xs mt-0.5 text-muted-foreground truncate">{tool.description}</p>
        </div>
      </button>
      <button onClick={onFav} className="w-7 h-7 flex items-center justify-center rounded-lg active:scale-90 shrink-0">
        <Star size={15} fill={isFav ? "hsl(43,82%,55%)" : "none"} style={{ color: isFav ? "hsl(43,82%,55%)" : "hsl(218,20%,42%)" }} />
      </button>
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();

  const isPremium              = useAppStore((s) => s.isPremium);
  const premiumUserTitle       = useAppStore((s) => s.premiumUserTitle);
  const premiumUserMessage     = useAppStore((s) => s.premiumUserMessage);
  const pendingPremiumRequest  = useAppStore((s) => s.pendingPremiumRequest);
  const appName                = useAppStore((s) => s.appName);
  const appLogo                = useAppStore((s) => s.appLogo);
  const favorites           = useAppStore((s) => s.favorites);
  const recentTools         = useAppStore((s) => s.recentTools);
  const proUpgradeMessage    = useAppStore((s) => s.proUpgradeMessage);
  const proUpgradeLink       = useAppStore((s) => s.proUpgradeLink);
  const proUpgradeButtonText = useAppStore((s) => s.proUpgradeButtonText);
  const proUpgradeTitle      = useAppStore((s) => s.proUpgradeTitle);
  const toggleFavorite      = useAppStore((s) => s.toggleFavorite);
  const addRecentTool       = useAppStore((s) => s.addRecentTool);
  const deviceId            = useAppStore((s) => s.deviceId);

  const logoSrc = appLogo ?? "/onetailor-logo.png";

  const [searchQuery,   setSearchQuery]   = useState("");
  const [showProPopup,  setShowProPopup]  = useState(false);

  // ── Add-Measurement modal ──────────────────────────────────────────────────
  const [showMeasureModal,    setShowMeasureModal]    = useState(false);
  const [modalSearch,         setModalSearch]         = useState("");
  const [modalCustomers,      setModalCustomers]      = useState<HomeCustomer[]>([]);
  const [modalLoading,        setModalLoading]        = useState(false);

  // ── Recent measurements widget ─────────────────────────────────────────────
  const [recentMeasurements,   setRecentMeasurements]   = useState<RecentMeasurement[]>([]);
  const [homeCategoryFilter,   setHomeCategoryFilter]   = useState("all");

  // Fetch recent measurements on mount
  useEffect(() => {
    if (!deviceId) return;
    fetch(`/api/tailoring/measurements/recent?deviceId=${deviceId}&limit=8`)
      .then(r => r.ok ? r.json() : [])
      .then(setRecentMeasurements)
      .catch(() => {});
  }, [deviceId]);

  // Fetch customers for modal
  useEffect(() => {
    if (!showMeasureModal) return;
    setModalLoading(true);
    const did = deviceId || getDeviceId();
    const params = new URLSearchParams({ deviceId: did });
    if (modalSearch) params.set("search", modalSearch);
    fetch(`/api/tailoring/customers?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: HomeCustomer[]) => { setModalCustomers(data); setModalLoading(false); })
      .catch(() => setModalLoading(false));
  }, [showMeasureModal, modalSearch, deviceId]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const recentCategories = useMemo(() =>
    [...new Set(recentMeasurements.map(m => m.category))].sort(),
    [recentMeasurements]
  );

  const filteredRecentMeasurements = useMemo(() =>
    homeCategoryFilter === "all"
      ? recentMeasurements
      : recentMeasurements.filter(m => m.category === homeCategoryFilter),
    [recentMeasurements, homeCategoryFilter]
  );

  const displayedFavorites = favorites.slice(0, 4);
  // Show last 4 used tools at the top regardless of favorites overlap
  const quickAccessTools = recentTools.slice(0, 4);

  const RECOMMENDED_TOOL_IDS = [
    "customer-measurement",
    "measurement-card",
    "profit",
    "fabric-cost",
    "delivery-date",
    "fabric-requirement",
  ];
  const recommendedTools = RECOMMENDED_TOOL_IDS
    .map(id => getToolById(id))
    .filter((t): t is NonNullable<ReturnType<typeof getToolById>> => !!t);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleOpen = (toolId: string, path: string) => {
    addRecentTool(toolId);
    // Track tool use on server for lead scoring (fire-and-forget)
    try {
      const did = getDeviceId();
      if (did) {
        fetch("/api/crm/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: did, toolId, eventType: "use" }),
        }).catch(() => {});
      }
    } catch {}
    setLocation(path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handleNavigate = (path: string) => {
    setLocation(path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLocation(`/all-tools?q=${encodeURIComponent(searchQuery)}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handleSelectModalCustomer = (c: HomeCustomer) => {
    setShowMeasureModal(false);
    setModalSearch("");
    handleNavigate(`/add-customer?action=new_measurement&customerId=${c.id}`);
  };

  const handleAddNewClientFromModal = () => {
    setShowMeasureModal(false);
    setModalSearch("");
    handleNavigate("/add-customer?action=new_client&mode=quick");
  };

  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 pb-8">

      {/* Header */}
      <div className="pt-7 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div style={{ width: 46, height: 46, borderRadius: 13, overflow: "hidden", border: "1.5px solid rgba(212,160,32,0.35)", flexShrink: 0, boxShadow: "0 0 20px rgba(212,160,32,0.15)" }}>
              <img src={logoSrc} alt={appName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-foreground" style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800 }}>
                  {appName.includes(" ") ? appName.split(" ")[0] : appName}
                </span>
                {appName.includes(" ") && (
                  <span className="gold-shimmer" style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800 }}>
                    {appName.split(" ").slice(1).join(" ")}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground" style={{ letterSpacing: "0.04em" }}>Business tools for tailors</p>
            </div>
          </div>
          {isPremium ? (
            <button
              onClick={() => setLocation("/premium-activated")}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 active:scale-95 transition-transform"
              style={{ background: "rgba(212,160,32,0.1)", border: "1px solid rgba(212,160,32,0.3)", color: "hsl(43,82%,60%)", fontSize: 11, fontWeight: 700 }}>
              <Crown size={12} /> ⭐ Premium Active
            </button>
          ) : (
            <button onClick={() => setLocation("/pre-unlock")}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 active:scale-95 transition-transform"
              style={{ background: "rgba(212,160,32,0.1)", border: "1px solid rgba(212,160,32,0.3)", color: "hsl(43,82%,60%)", fontSize: 11, fontWeight: 700 }}>
              <ShieldCheck size={12} /> {pendingPremiumRequest ? "⭐ Resume Upgrade" : "⭐ Unlock Premium"}
            </button>
          )}
        </div>
      </div>

      {/* Premium Status Popup */}
      {showProPopup && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-primary/20 animate-in zoom-in-95 duration-200">
            <div className="p-4 flex items-center justify-between border-b border-border bg-muted/20">
              <div className="flex items-center gap-2 text-primary">
                <Crown size={18} />
                <h3 className="text-sm font-black uppercase tracking-wider">{proUpgradeTitle || "OneTailor Pro"}</h3>
              </div>
              <button onClick={() => setShowProPopup(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <p className="text-sm text-foreground font-medium leading-relaxed">{proUpgradeMessage}</p>
              <div className="space-y-3">
                <a
                  href={proUpgradeLink || "#"}
                  target={proUpgradeLink ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-sm active:scale-[0.98] transition-all shadow-lg shadow-primary/20 gap-2"
                >
                  <ExternalLink size={16} />
                  {proUpgradeButtonText}
                </a>
                <button onClick={() => setShowProPopup(false)} className="w-full py-3 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Measurement Modal */}
      {showMeasureModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200"
          onClick={() => { setShowMeasureModal(false); setModalSearch(""); }}
        >
          <div
            className="bg-card w-full max-w-lg rounded-t-3xl overflow-hidden shadow-2xl border border-border border-b-0 animate-in slide-in-from-bottom-4 duration-300 pb-safe"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            <div className="px-5 pb-2 pt-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-black">Add Measurement</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Search for a client or add a new one</p>
                </div>
                <button
                  onClick={() => { setShowMeasureModal(false); setModalSearch(""); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/50"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  autoFocus
                  placeholder="Search client by name or phone…"
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none bg-muted/30 border border-border focus:border-primary/50 transition-all"
                />
              </div>

              {/* Add New Client option */}
              <button
                onClick={handleAddNewClientFromModal}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl mb-3 bg-primary/10 border border-primary/20 text-primary active:scale-[0.98] transition-all text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Users size={16} />
                </div>
                <div>
                  <p className="text-sm font-black">Add New Client</p>
                  <p className="text-[10px] font-medium opacity-70">Enter details and take measurements</p>
                </div>
                <ChevronRight size={14} className="ml-auto shrink-0" />
              </button>

              {/* Customer list */}
              <div className="max-h-64 overflow-y-auto space-y-2 pb-4">
                {modalLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin border-primary" />
                  </div>
                ) : modalCustomers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-xs">{modalSearch ? "No clients match your search" : "No clients yet"}</p>
                  </div>
                ) : (
                  modalCustomers.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectModalCustomer(c)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-muted/20 border border-border hover:border-primary/30 active:scale-[0.98] transition-all text-left"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${c.gender === "female" ? "bg-pink-500/10 text-pink-500" : c.gender === "male" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"}`}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.phone}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <Ruler size={13} className="text-primary" />
                        <span className="text-[10px] font-bold text-primary">Measure</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Status Banner */}
      <PremiumStatusBanner />

      {/* Premium Welcome Message — admin-customizable, shown only to PREMIUM users */}
      {isPremium && premiumUserMessage && (
        <div className="mb-4 rounded-2xl p-4 flex gap-3" style={{ background: "rgba(212,160,32,0.07)", border: "1px solid rgba(212,160,32,0.22)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(212,160,32,0.12)", border: "1px solid rgba(212,160,32,0.25)" }}>
            <Crown size={18} style={{ color: "hsl(43,82%,55%)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-wider mb-0.5" style={{ color: "hsl(43,82%,55%)" }}>
              {premiumUserTitle || "From OneTailor"}
            </p>
            <p className="text-xs text-foreground/80 leading-relaxed">{premiumUserMessage}</p>
          </div>
        </div>
      )}

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search tools…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setLocation("/all-tools")}
            className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm outline-none shadow-sm"
            style={{ background: "hsl(218,44%,11%)", border: "1px solid hsl(218,38%,18%)", color: "hsl(43,25%,88%)" }}
            readOnly
          />
        </div>
      </form>

      {/* ── Recently Used Quick Access ─────────────────────────────────────── */}
      {quickAccessTools.length > 0 && (
        <section className="mb-5">
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <div className="flex items-center gap-2">
              <Clock size={13} style={{ color: "hsl(43,82%,55%)" }} />
              <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(212,160,32,0.65)" }}>Recently Used</p>
            </div>
            <button
              onClick={() => handleNavigate("/all-tools")}
              className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
            >
              All Tools <ChevronRight size={10} className="inline ml-0.5" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {quickAccessTools.map((id) => {
              const tool = getToolById(id);
              if (!tool) return null;
              const Icon = tool.icon;
              return (
                <button
                  key={id}
                  onClick={() => handleOpen(id, tool.path)}
                  className="flex flex-col items-center gap-2 py-3 px-1.5 rounded-2xl active:scale-[0.95] transition-all"
                  style={{ background: "hsl(218,44%,11%)", border: `1px solid ${tool.borderColor}` }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: tool.iconBg }}
                  >
                    <Icon size={18} strokeWidth={2} style={{ color: tool.iconColor }} />
                  </div>
                  <p className="text-[10px] font-black text-center leading-tight line-clamp-2 w-full px-0.5" style={{ color: "hsl(43,25%,88%)" }}>
                    {tool.name}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Client Management ─────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
              <Users size={16} />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-foreground/80">Client Management</p>
          </div>
          <button
            onClick={() => handleNavigate("/add-customer")}
            className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
          >
            View All <ChevronRight size={10} className="inline ml-0.5" />
          </button>
        </div>

        {/* 3-column shortcut grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Clients Database */}
          <button
            onClick={() => handleNavigate("/add-customer")}
            className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-gradient-to-br from-blue-600/10 to-blue-600/[0.02] border border-blue-500/20 active:scale-[0.97] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
              <Users size={19} />
            </div>
            <div className="text-center">
              <p className="text-[12px] font-black text-foreground leading-tight">Clients</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight mt-0.5">Database</p>
            </div>
          </button>

          {/* Add Measurement (shortcut) */}
          <button
            onClick={() => setShowMeasureModal(true)}
            className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-gradient-to-br from-emerald-600/10 to-emerald-600/[0.02] border border-emerald-500/20 active:scale-[0.97] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 group-hover:scale-110 transition-transform">
              <Ruler size={19} />
            </div>
            <div className="text-center">
              <p className="text-[12px] font-black text-foreground leading-tight">Measure</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight mt-0.5">Quick Measurement</p>
            </div>
          </button>

          {/* Cards Generator */}
          <button
            onClick={() => handleNavigate("/measurement-card")}
            className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-gradient-to-br from-amber-600/10 to-amber-600/[0.02] border border-amber-500/20 active:scale-[0.97] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-600/20 group-hover:scale-110 transition-transform">
              <LayoutGrid size={19} />
            </div>
            <div className="text-center">
              <p className="text-[12px] font-black text-foreground leading-tight">Cards</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight mt-0.5">Generator</p>
            </div>
          </button>
        </div>
      </section>

      {/* ── Recent Measurements Widget ──────────────────────────────────────── */}
      {recentMeasurements.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Ruler size={16} />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-foreground/80">Recent Measurements</p>
            </div>
            <button
              onClick={() => handleNavigate("/add-customer")}
              className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
            >
              All Clients <ChevronRight size={10} className="inline ml-0.5" />
            </button>
          </div>

          {/* Category filter chips */}
          {recentCategories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
              <button
                onClick={() => setHomeCategoryFilter("all")}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${homeCategoryFilter === "all" ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground"}`}
              >
                All
              </button>
              {recentCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setHomeCategoryFilter(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all whitespace-nowrap ${homeCategoryFilter === cat ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Measurement cards */}
          <div className="space-y-2">
            {filteredRecentMeasurements.map(m => (
              <button
                key={m.id}
                onClick={() => handleNavigate(`/add-customer?action=new_measurement&customerId=${m.customerId}`)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-primary/20 active:scale-[0.98] transition-all text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Ruler size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold truncate">{m.label}</p>
                    <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/10">
                      {m.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {m.customerName ?? "Unknown client"} · {relativeDate(m.createdAt)}
                  </p>
                </div>
                <ChevronRight size={13} className="text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Favorites ───────────────────────────────────────────────────────── */}
      {displayedFavorites.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500 border border-pink-500/20">
                <Star size={16} />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-foreground/80">Favorites</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {displayedFavorites.map((id) => {
              const tool = getToolById(id)!;
              return (
                <button
                  key={id}
                  onClick={() => handleNavigate(tool.path)}
                  className="p-4 rounded-2xl bg-card border border-border flex flex-col gap-3 active:scale-[0.98] transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: tool.iconBg, color: tool.iconColor }}>
                    <tool.icon size={20} />
                  </div>
                  <div>
                    <p className="text-[13px] font-black text-foreground line-clamp-1">{tool.name}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight line-clamp-1">{tool.category}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Categories ──────────────────────────────────────────────────────── */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] font-bold" style={{ color: "rgba(212,160,32,0.55)", letterSpacing: "0.2em", textTransform: "uppercase" }}>Categories</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {CATEGORIES.map(({ id, emoji }) => {
            const count = ALL_TOOLS.filter((t) => t.category === id).length;
            return (
              <button key={id} onClick={() => handleNavigate(`/all-tools?cat=${id}`)}
                className="flex items-center gap-3 p-3.5 rounded-2xl text-left active:scale-[0.97] transition-all"
                style={{ background: "hsl(218,44%,11%)", border: "1px solid hsl(218,38%,18%)" }}>
                <span className="text-2xl">{emoji}</span>
                <div>
                  <p className="font-bold text-sm capitalize" style={{ color: "hsl(43,25%,88%)" }}>{id}</p>
                  <p className="text-xs text-muted-foreground">{count} tools</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Recommended Tools ───────────────────────────────────────────────── */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] font-bold" style={{ color: "rgba(212,160,32,0.55)", letterSpacing: "0.2em", textTransform: "uppercase" }}>Recommended Tools</p>
          <button onClick={() => handleNavigate("/all-tools")}
            className="flex items-center gap-1 text-xs font-semibold active:scale-95"
            style={{ color: "hsl(43,82%,55%)" }}>
            All <ArrowRight size={12} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {recommendedTools.map((tool) => (
            <ToolRow
              key={tool.id}
              toolId={tool.id}
              onClick={() => handleOpen(tool.id, tool.path)}
              isFav={favorites.includes(tool.id)}
              onFav={() => toggleFavorite(tool.id)}
            />
          ))}
        </div>
      </section>

      {/* ── Browse All ──────────────────────────────────────────────────────── */}
      <button onClick={() => handleNavigate("/all-tools")}
        className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        style={{ background: "hsl(218,44%,11%)", border: "1px solid hsl(218,38%,18%)", color: "hsl(43,25%,88%)" }}>
        <Grid3X3 size={15} />
        Browse All {ALL_TOOLS.length} Tools
        <ChevronRight size={15} className="text-muted-foreground/50" />
      </button>

      {/* ── Free User Teaser — shown only to users NOT on Premium (encourage upgrade) ── */}
      {!isPremium && (
        <div
          onClick={() => setLocation(pendingPremiumRequest ? "/pre-unlock" : "/premium-details")}
          className="mt-3 relative overflow-hidden p-6 rounded-[2.5rem] bg-amber-950/60 border border-amber-500/20 cursor-pointer active:scale-[0.98] transition-all group"
        >
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-colors" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-500/30 group-hover:scale-110 transition-transform">
              <Crown size={28} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-white leading-tight">
                ⭐ {pendingPremiumRequest ? "Resume Upgrade" : "Unlock Premium"}
              </h3>
              <p className="text-xs text-amber-200/60 mt-1">
                {pendingPremiumRequest ? "Finish your payment to activate Premium" : "Unlock all professional tailoring tools"}
              </p>
            </div>
            <ChevronRight className="text-amber-400" />
          </div>
        </div>
      )}

      {/* ── Pro Upgrade Teaser — shown only to Premium users (encourage Pro upgrade) ── */}
      {isPremium && proUpgradeMessage && (
        <div onClick={() => setShowProPopup(true)} className="mt-3 relative overflow-hidden p-6 rounded-[2.5rem] bg-slate-900 border border-primary/20 cursor-pointer active:scale-[0.98] transition-all group">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 group-hover:scale-110 transition-transform">
              <Crown size={28} className="text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-white leading-tight">⭐ {proUpgradeTitle || "Unlock OneTailor Pro"}</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{proUpgradeMessage}</p>
            </div>
            <ChevronRight className="text-primary" />
          </div>
        </div>
      )}
    </div>
  );
}
