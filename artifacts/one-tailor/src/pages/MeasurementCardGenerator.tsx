import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Palette, Download, Printer, ShieldCheck, Users, ChevronRight,
  MapPin, Phone, MessageCircle, Quote, Ruler, Share2, AlertCircle,
  Instagram, Facebook, Youtube, Lock, Wand2
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

const DEFAULT_GLOBAL_NOTE = "All measurements are in the recorded unit. Please confirm before cutting.";

const THEMES = [
  { id: "dark",    label: "Classic Dark",    bg: "bg-slate-900",   text: "text-white",       border: "border-white/10",        accent: "text-amber-400",   hex: "#0f172a", hexAccent: "#fbbf24" },
  { id: "light",   label: "Clean Light",     bg: "bg-white",       text: "text-slate-900",   border: "border-slate-200",       accent: "text-indigo-600",  hex: "#ffffff", hexAccent: "#4f46e5" },
  { id: "gold",    label: "Gold Luxury",     bg: "bg-amber-950",   text: "text-amber-50",    border: "border-amber-700/40",    accent: "text-amber-400",   hex: "#451a03", hexAccent: "#f59e0b" },
  { id: "indigo",  label: "Indigo Pro",      bg: "bg-indigo-950",  text: "text-indigo-50",   border: "border-indigo-700/40",   accent: "text-indigo-300",  hex: "#1e1b4b", hexAccent: "#818cf8" },
  { id: "emerald", label: "Emerald Fresh",   bg: "bg-emerald-950", text: "text-emerald-50",  border: "border-emerald-700/40",  accent: "text-emerald-300", hex: "#022c22", hexAccent: "#34d399" },
];

const IMAGE_FIELDS = ["image", "styleimage", "photo", "designimage", "referenceimage"];

// ─── Card Styles ──────────────────────────────────────────────────────────────

type CardStyleDef = {
  id: string; label: string; premium: boolean;
};

const CARD_STYLES: CardStyleDef[] = [
  { id: "standard",  label: "Standard",       premium: false },
  { id: "executive", label: "Executive",      premium: true },
  { id: "luxury",    label: "Luxury",         premium: true },
  { id: "modern",    label: "Modern",         premium: true },
  { id: "minimal",   label: "Minimal",        premium: true },
  { id: "fashion",   label: "Fashion Studio", premium: true },
  { id: "elegant",   label: "Elegant",        premium: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMeasurements(raw: string): Record<string, string> {
  if (!raw) return {};
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
  const isPremium       = useAppStore((s) => s.isPremium);

  const [step, setStep]                         = useState<Step>("select_customer");
  const [customers, setCustomers]               = useState<Customer[]>([]);
  const [records, setRecords]                   = useState<MeasurementRecord[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedRecord, setSelectedRecord]     = useState<MeasurementRecord | null>(null);
  const [theme, setTheme]                       = useState(THEMES[0]);
  const [selectedCardStyle, setSelectedCardStyle] = useState("standard");
  const [customNote, setCustomNote]             = useState("");
  const [loading, setLoading]                   = useState(false);
  const [sharing, setSharing]                   = useState(false);
  const [search, setSearch]                     = useState("");
  const [error, setError]                       = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingRecords, setLoadingRecords]     = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── BrandKit Validation ───────────────────────────────────────────────────
  const isBrandKitComplete = useMemo(() =>
    !!(appLogo && businessProfile?.name && (businessProfile.phone || businessProfile.socials?.whatsapp)),
    [appLogo, businessProfile?.name, businessProfile?.phone, businessProfile?.socials?.whatsapp]
  );

  // ── Fetch customers on mount ───────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    setLoadingCustomers(true);
    const deviceId = getDeviceId();
    fetch(`/api/tailoring/customers?deviceId=${deviceId}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => setCustomers(Array.isArray(data) ? data : []))
      .catch(err => { if (err.name !== "AbortError") setCustomers([]); })
      .finally(() => setLoadingCustomers(false));
    return () => controller.abort();
  }, []);

  // ── Fetch records when customer chosen ────────────────────────────────────
  useEffect(() => {
    if (!selectedCustomer) return;
    const controller = new AbortController();
    setLoadingRecords(true);
    fetch(`/api/tailoring/measurements/${selectedCustomer.id}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => setRecords(Array.isArray(data) ? data : []))
      .catch(err => { if (err.name !== "AbortError") setRecords([]); })
      .finally(() => setLoadingRecords(false));
    return () => controller.abort();
  }, [selectedCustomer]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setSelectedRecord(null);
    setStep("select_record");
    setError("");
  };

  const handleSelectRecord = (r: MeasurementRecord) => {
    setSelectedRecord(r);
    setStep("customize");
    setError("");
  };

  const onBack = () => {
    if (step === "customize")     return setStep("select_record");
    if (step === "select_record") return setStep("select_customer");
    setLocation("/all-tools");
    setError("");
  };

  // ── Generate card blob ─────────────────────────────────────────────────────
  // oklch fix: use a 1×1 canvas to convert any oklch/non-rgb color to rgb,
  // apply those as inline styles before html2canvas reads the DOM, then restore.
  const generateCardBlob = useCallback(async (): Promise<Blob> => {
    if (!cardRef.current) throw new Error("Card not ready");

    // Wait for all images in the card to finish loading
    const imgs = Array.from(cardRef.current.querySelectorAll("img"));
    await Promise.all(imgs.map(img =>
      img.complete
        ? Promise.resolve()
        : new Promise(res => { img.onload = res; img.onerror = res; })
    ));
    await new Promise(res => setTimeout(res, 150));

    // ── Inline-style all color props so html2canvas sees rgb(), never oklch() ──
    const cvs = document.createElement("canvas");
    cvs.width = cvs.height = 1;
    const cvCtx = cvs.getContext("2d")!;

    const toRgb = (color: string): string | null => {
      if (!color || color === "rgba(0, 0, 0, 0)" || color === "transparent") return null;
      if (/^rgb/.test(color) || /^#/.test(color)) return color; // already safe
      try {
        cvCtx.clearRect(0, 0, 1, 1);
        cvCtx.fillStyle = color;
        cvCtx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = cvCtx.getImageData(0, 0, 1, 1).data;
        if (a === 0) return null;
        return a === 255 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
      } catch { return null; }
    };

    const COLOR_PROPS = [
      "color", "background-color",
      "border-top-color", "border-right-color",
      "border-bottom-color", "border-left-color",
    ];

    const allEls = [cardRef.current, ...Array.from(cardRef.current.querySelectorAll<HTMLElement>("*"))];
    const savedStyles = allEls.map(el => el.style.cssText);

    allEls.forEach(el => {
      const computed = window.getComputedStyle(el);
      COLOR_PROPS.forEach(prop => {
        const val = computed.getPropertyValue(prop);
        const rgb = toRgb(val);
        if (rgb) el.style.setProperty(prop, rgb);
      });
    });

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: theme.hex,
        logging: false,
        removeContainer: true,
        onclone: (_doc, el) => {
          el.querySelectorAll("img").forEach(img => {
            (img as HTMLImageElement).style.display = "block";
          });
        },
      });

      return new Promise((resolve, reject) => {
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error("Failed to generate image")),
          "image/png", 1.0
        );
      });
    } finally {
      // Always restore original inline styles
      allEls.forEach((el, i) => { el.style.cssText = savedStyles[i]; });
    }
  }, [theme.hex]);

  // ── Save To Device ────────────────────────────────────────────────────────
  const handleDownload = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) { setError("Card not ready. Please wait."); return null; }
    setLoading(true);
    setError("");
    try {
      const blob = await generateCardBlob();
      const url = URL.createObjectURL(blob);
      const filename = `${(selectedCustomer?.name || "client").replace(/\s+/g, "-").toLowerCase()}-measurement-card.png`;
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return blob;
    } catch (err) {
      console.error("Download error:", err);
      setError("Failed to save image. Please try Print instead.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [generateCardBlob, selectedCustomer?.name]);

  // ── Print card only ────────────────────────────────────────────────────────
  // Strategy: render the card to a PNG, open a minimal window, embed the image
  // and print it — this avoids all CSS/Tailwind resolution issues in popups.
  const handlePrint = useCallback(async () => {
    if (!cardRef.current) return;
    setLoading(true);
    setError("");
    try {
      const blob = await generateCardBlob();
      const url = URL.createObjectURL(blob);
      const printWin = window.open("", "_blank", "width=700,height=950");
      if (!printWin) { setError("Pop-up blocked. Please allow pop-ups for this site."); return; }
      printWin.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Measurement Card – ${selectedCustomer?.name ?? ""}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#fff; display:flex; justify-content:center; align-items:flex-start; padding:20px; }
    img { max-width:100%; height:auto; display:block; border-radius:12px; box-shadow:0 2px 12px rgba(0,0,0,.12); }
    @media print { body { padding:0; } img { box-shadow:none; border-radius:0; } }
  </style>
</head>
<body>
  <img src="${url}" />
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); setTimeout(function(){ window.close(); }, 600); }, 400);
    };
  </script>
</body>
</html>`);
      printWin.document.close();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error("Print error:", err);
      setError("Failed to prepare print. Try Save To Device instead.");
    } finally {
      setLoading(false);
    }
  }, [generateCardBlob, selectedCustomer?.name]);

  // ── Share with customer ───────────────────────────────────────────────────
  // Flow:
  //   1. Try Web Share API with image file  →  system share sheet (WhatsApp, etc.)
  //   2. If not supported: download image, then open wa.me with predefined text
  const handleShareToCustomer = useCallback(async () => {
    if (!selectedCustomer?.phone) { setError("Customer phone number is required for sharing."); return; }
    setSharing(true);
    setError("");

    const businessName = businessProfile?.name || appName;
    const predefinedMessage =
      `Hello ${selectedCustomer.name} 👋\n\n` +
      `Here is your measurement card from *${businessName}*.\n\n` +
      `Please review all measurements carefully before cutting.\n` +
      `If you have any questions feel free to reach us.\n\n` +
      `Thank you for choosing us! ✨`;

    const formattedPhone = selectedCustomer.phone.replace(/\D/g, "");

    try {
      const blob = await generateCardBlob();
      const file = new File([blob], "measurement-card.png", { type: "image/png" });
      const shareData = { title: `${selectedCustomer.name} – Measurement Card`, text: predefinedMessage, files: [file] };

      if (navigator.canShare && navigator.canShare(shareData)) {
        // Device supports file sharing — let the user pick WhatsApp directly
        await navigator.share(shareData);
      } else {
        // Fallback: save image to device, then open WhatsApp with text
        // The user can attach the downloaded image manually in WhatsApp
        const url = URL.createObjectURL(blob);
        const filename = `${selectedCustomer.name.replace(/\s+/g, "-").toLowerCase()}-measurement-card.png`;
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 5000);

        // Brief pause so download starts, then open WhatsApp
        await new Promise(res => setTimeout(res, 800));
        const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(predefinedMessage + "\n\n_(Image saved to your gallery — tap the 📎 icon to attach it)_")}`;
        window.open(waUrl, "_blank");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        // Last resort: open WhatsApp with message even if image gen failed
        const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(predefinedMessage)}`;
        window.open(waUrl, "_blank");
      }
    } finally {
      setSharing(false);
    }
  }, [generateCardBlob, selectedCustomer, businessProfile?.name, appName]);

  // ── Memoised derived data ─────────────────────────────────────────────────

  const filteredCustomers = useMemo(() =>
    customers.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    ), [customers, search]
  );

  const { entries, previewImageUrl } = useMemo(() => {
    if (!selectedRecord) return { entries: [] as [string, string][], previewImageUrl: null };
    const allEntries = Object.entries(parseMeasurements(selectedRecord.values));
    let previewImageUrl: string | null = null;
    for (const [k, v] of allEntries) {
      if (IMAGE_FIELDS.includes(k.toLowerCase()) && typeof v === "string" &&
          (v.startsWith("http") || v.startsWith("data:image"))) {
        previewImageUrl = v;
        break;
      }
    }
    const entries = allEntries.filter(([k, v]) => {
      if (IMAGE_FIELDS.includes(k.toLowerCase())) return false;
      if (typeof v === "string" && (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("data:image"))) return false;
      return true;
    }) as [string, string][];
    return { entries, previewImageUrl };
  }, [selectedRecord]);

  const socials = businessProfile?.socials;

  // ── Address detail helpers ─────────────────────────────────────────────────
  const addrLandmark = businessProfile?.addressDetails?.landmark || "";
  const addrStateCountry = [businessProfile?.addressDetails?.state, businessProfile?.addressDetails?.country].filter(Boolean).join(", ");

  const socialLine = useMemo(() => {
    const s = businessProfile?.socials;
    return [
      s?.instagram ? `IG: @${s.instagram}` : null,
      s?.whatsapp  ? `WA: ${s.whatsapp}`   : null,
      s?.facebook  ? `FB: ${s.facebook}`   : null,
      s?.tiktok    ? `TT: @${s.tiktok}`    : null,
      s?.youtube   ? `YT: ${s.youtube}`    : null,
    ].filter(Boolean).join(" | ");
  }, [businessProfile?.socials]);

  const getUnitSymbol = (unit?: string) =>
    unit === "CM" ? "cm" : unit === "INCH" ? '"' : (selectedRecord?.unit ?? "");

  // ── BrandKit guard ────────────────────────────────────────────────────────
  if (!isBrandKitComplete && step !== "select_customer") {
    return (
      <div className="max-w-xl mx-auto pb-24 relative min-h-screen">
        <PageHeader title="Brand Kit Required" onBack={() => setStep("select_customer")} />
        <div className="px-4 py-20">
          <div className="text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">Complete Your Brand Kit First</h3>
            <p className="text-muted-foreground mb-6">
              Please add your business logo and name in Settings before generating measurement cards.
            </p>
            <Button onClick={() => setLocation("/settings")} className="w-full">
              Go to Brand Settings
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

      {error && (
        <div className="mx-4 mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="px-4 py-4 space-y-6">

        {/* ── STEP 1: SELECT CUSTOMER ── */}
        {step === "select_customer" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <input
              placeholder="Search clients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-card border border-border outline-none focus:border-primary text-sm font-medium"
            />

            <div className="space-y-3">
              {loadingCustomers ? (
                <div className="text-center py-20">
                  <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">Loading customers…</p>
                </div>
              ) : filteredCustomers.length === 0 ? (
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

        {/* ── STEP 2: SELECT RECORD ── */}
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
              {loadingRecords ? (
                <div className="text-center py-20">
                  <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">Loading measurements…</p>
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-20 bg-card border border-dashed border-border rounded-3xl">
                  <p className="text-muted-foreground text-sm">No measurements recorded for this client.</p>
                  <button onClick={() => setLocation("/customer-measurement")} className="mt-4 text-xs font-bold text-primary">Go to Customer Measurement</button>
                </div>
              ) : records.map(r => (
                <div key={r.id} onClick={() => handleSelectRecord(r)} className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between cursor-pointer hover:border-primary/30 transition-all active:scale-[0.98]">
                  <div>
                    <p className="font-bold text-sm">{r.label}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{r.category}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: CUSTOMIZE & GENERATE ── */}
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
                    className={`shrink-0 px-4 py-2.5 rounded-xl border text-[10px] font-bold transition-all ${theme.id === t.id ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-card border-border text-muted-foreground"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CARD STYLE SELECTOR */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Wand2 size={14} className="text-primary" />
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Card Style</label>
                {!isPremium && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">PRO</span>
                )}
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
                {CARD_STYLES.map(s => {
                  const locked = s.premium && !isPremium;
                  const STYLE_SWATCHES: Record<string, { bg: string; accent: string }> = {
                    standard:  { bg: "linear-gradient(135deg,#1a1a2e 0%,#16213e 100%)", accent: "#c8a84b" },
                    executive: { bg: "linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)", accent: "#64b5f6" },
                    luxury:    { bg: "linear-gradient(135deg,#2d1b00 0%,#5c3800 100%)", accent: "#ffd700" },
                    modern:    { bg: "linear-gradient(135deg,#6d28d9 0%,#7c3aed 50%,#4f46e5 100%)", accent: "#a78bfa" },
                    minimal:   { bg: "linear-gradient(135deg,#f8f9fa 0%,#e9ecef 100%)", accent: "#6c757d" },
                    fashion:   { bg: "linear-gradient(135deg,#1a0a1e 0%,#3d0a4f 100%)", accent: "#e879f9" },
                    elegant:   { bg: "linear-gradient(135deg,#1c1c1c 0%,#2d2d2d 100%)", accent: "#d4af37" },
                  };
                  const swatch = STYLE_SWATCHES[s.id] || STYLE_SWATCHES.standard;
                  return (
                    <button
                      key={s.id}
                      onClick={() => !locked && setSelectedCardStyle(s.id)}
                      title={locked ? "Upgrade to Premium to unlock this style" : s.label}
                      className={`shrink-0 relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all ${selectedCardStyle === s.id ? "border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/40" : "border-border"} ${locked ? "opacity-70" : "hover:border-primary/50"}`}
                      style={{ minWidth: 68 }}
                    >
                      <div
                        className="w-14 h-10 rounded-xl overflow-hidden relative"
                        style={{ background: swatch.bg }}
                      >
                        <div className="absolute inset-0 flex flex-col justify-between p-1.5">
                          <div className="flex gap-0.5">
                            <div className="h-1 w-4 rounded-full opacity-80" style={{ background: swatch.accent }} />
                            <div className="h-1 w-3 rounded-full opacity-40" style={{ background: swatch.accent }} />
                          </div>
                          <div className="space-y-0.5">
                            <div className="h-0.5 w-full rounded-full opacity-30" style={{ background: swatch.accent }} />
                            <div className="h-0.5 w-3/4 rounded-full opacity-20" style={{ background: swatch.accent }} />
                          </div>
                        </div>
                        {locked && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                            <Lock size={10} className="text-white/80" />
                          </div>
                        )}
                      </div>
                      <span className={`text-[9px] font-black text-center leading-tight ${selectedCardStyle === s.id ? "text-primary" : "text-muted-foreground"}`}>
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PREVIEW CARD */}
            <div className="p-1 bg-slate-200 dark:bg-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
              <div ref={cardRef} className={`w-full ${theme.bg} ${theme.text} overflow-hidden`}>

                {/* ══════════════════════════ STANDARD ══════════════════════════ */}
                {selectedCardStyle === "standard" && (
                  <div className="p-8 space-y-8 relative">
                    <div className={`pb-5 border-b ${theme.border}`}>
                      <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-start">
                        <div className={`w-16 h-16 rounded-full overflow-hidden border-2 ${theme.border} bg-white shrink-0 shadow-sm`}>
                          {appLogo && <img src={appLogo} className="w-full h-full object-cover" alt="Logo" crossOrigin="anonymous" />}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <h2 className="text-lg font-black uppercase tracking-tight leading-tight truncate">{businessProfile?.name || appName}</h2>
                          {businessProfile?.tagline && <p className="text-[9px] font-bold opacity-60 italic leading-tight truncate">{businessProfile.tagline}</p>}
                          {(businessProfile?.phone || socials?.whatsapp) && (
                            <div className="flex items-center gap-3 flex-wrap">
                              {businessProfile?.phone && <span className="text-[10px] font-bold opacity-70 flex items-center gap-1"><Phone size={10} className="opacity-60 shrink-0" />{businessProfile.phone}</span>}
                              {socials?.whatsapp && <span className="text-[10px] font-bold opacity-70 flex items-center gap-1"><MessageCircle size={10} className="opacity-60 shrink-0" />{socials.whatsapp}</span>}
                            </div>
                          )}
                          {addrLandmark && <p className="text-[10px] font-bold opacity-70 flex items-center gap-1"><MapPin size={10} className="opacity-50 shrink-0" />{addrLandmark}{addrStateCountry ? `, ${addrStateCountry}` : ""}</p>}
                          {!addrLandmark && addrStateCountry && <p className="text-[10px] font-bold opacity-60">{addrStateCountry}</p>}
                          {!addrLandmark && !addrStateCountry && businessProfile?.address && <p className="text-[10px] font-bold opacity-70 flex items-start gap-1"><MapPin size={10} className="opacity-50 shrink-0 mt-0.5" /><span className="leading-tight">{businessProfile.address}</span></p>}
                          {(socials?.instagram || socials?.facebook || socials?.youtube) && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {socials?.instagram && <span style={{background:"rgba(255,255,255,0.15)",borderRadius:999,padding:"2px 6px",display:"inline-flex",alignItems:"center",gap:3}}><Instagram size={8} style={{opacity:0.9}} /><span style={{fontSize:8,fontWeight:700,opacity:0.9,lineHeight:1}}>@{socials.instagram}</span></span>}
                              {socials?.facebook && <span style={{background:"rgba(255,255,255,0.15)",borderRadius:999,padding:"2px 6px",display:"inline-flex",alignItems:"center",gap:3}}><Facebook size={8} style={{opacity:0.9}} /><span style={{fontSize:8,fontWeight:700,opacity:0.9,lineHeight:1}}>{socials.facebook}</span></span>}
                              {socials?.youtube && <span style={{background:"rgba(255,255,255,0.15)",borderRadius:999,padding:"2px 6px",display:"inline-flex",alignItems:"center",gap:3}}><Youtube size={8} style={{opacity:0.9}} /><span style={{fontSize:8,fontWeight:700,opacity:0.9,lineHeight:1}}>{socials.youtube}</span></span>}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[8px] opacity-40 uppercase font-black tracking-widest">Client ID</p>
                          <p className="text-[13px] font-mono font-black mt-0.5">#{(businessProfile?.clientIdPrefix || "OT")}-{String(selectedCustomer.id).padStart(4, "0")}</p>
                        </div>
                      </div>
                    </div>
                    <div className={`py-3 border-b ${theme.border}`}>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-center opacity-80">{selectedRecord.category} — {selectedRecord.label}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-0.5">
                        <p className="text-[8px] opacity-40 uppercase font-black tracking-widest">Customer</p>
                        <h4 className="text-base font-black leading-none">{selectedCustomer.name}</h4>
                        <p className="text-[11px] font-bold opacity-60">{selectedCustomer.phone}</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-[8px] opacity-40 uppercase font-black tracking-widest">Date Generated</p>
                        <p className="text-[11px] font-bold">{new Date().toLocaleDateString("en-GB", {day:"2-digit",month:"short",year:"numeric"})}</p>
                      </div>
                    </div>
                    {previewImageUrl && (
                      <div className={`rounded-2xl overflow-hidden border ${theme.border} shadow-sm`}>
                        <img src={previewImageUrl} alt="Style Reference" className="w-full object-cover max-h-52" crossOrigin="anonymous" />
                        <div className={`px-3 py-1.5 border-t ${theme.border}`}><p className="text-[9px] font-black uppercase tracking-widest opacity-40 text-center">Style Reference</p></div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-x-12 gap-y-3 py-2">
                      {entries.map(([k, v]) => (
                        <div key={k} className={`flex justify-between items-baseline border-b ${theme.border} pb-1.5`}>
                          <span className="text-[10px] font-bold opacity-50 uppercase tracking-tight">{k}</span>
                          <span className="text-base font-black">{v}{getUnitSymbol(selectedRecord.unit)}</span>
                        </div>
                      ))}
                    </div>
                    <div className={`pt-6 border-t ${theme.border} text-center space-y-3`}>
                      <p className="text-[10px] font-semibold leading-relaxed italic opacity-80 px-4">{customNote || DEFAULT_GLOBAL_NOTE}</p>
                      <div className="flex flex-col items-center gap-1 pt-2">
                        <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-30">Generated By {businessProfile?.name || appName}</p>
                        <p className="text-[7px] font-bold opacity-20 uppercase">{new Date().toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ══════════════════════════ EXECUTIVE ══════════════════════════ */}
                {selectedCardStyle === "executive" && (
                  <div>
                    <div style={{height:4,background:theme.hexAccent}} />
                    <div className="px-8 pt-5 pb-4">
                      <div className="flex items-center gap-4">
                        {appLogo && (
                          <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0" style={{border:`1px solid ${theme.hexAccent}40`}}>
                            <img src={appLogo} className="w-full h-full object-cover" alt="Logo" crossOrigin="anonymous" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h2 className="text-xl font-black uppercase tracking-widest leading-tight">{businessProfile?.name || appName}</h2>
                          {businessProfile?.tagline && <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 mt-0.5">{businessProfile.tagline}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[7px] opacity-30 uppercase font-black tracking-widest">Client ID</p>
                          <p className="text-sm font-mono font-black mt-0.5" style={{color:theme.hexAccent}}>#{(businessProfile?.clientIdPrefix || "OT")}-{String(selectedCustomer.id).padStart(4, "0")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 pt-3 flex-wrap" style={{borderTop:"1px solid rgba(255,255,255,0.08)"}}>
                        {businessProfile?.phone && <span className="text-[10px] font-bold opacity-60 flex items-center gap-1"><Phone size={9} />{businessProfile.phone}</span>}
                        {socials?.whatsapp && <span className="text-[10px] font-bold opacity-60 flex items-center gap-1"><MessageCircle size={9} />{socials.whatsapp}</span>}
                        {addrLandmark && <span className="text-[10px] font-bold opacity-60 flex items-center gap-1"><MapPin size={9} />{addrLandmark}{addrStateCountry ? `, ${addrStateCountry}` : ""}</span>}
                        {!addrLandmark && addrStateCountry && <span className="text-[10px] font-bold opacity-40">{addrStateCountry}</span>}
                        {!addrLandmark && !addrStateCountry && businessProfile?.address && <span className="text-[10px] font-bold opacity-60 flex items-center gap-1"><MapPin size={9} />{businessProfile.address}</span>}
                      </div>
                    </div>
                    <div className="px-8 py-2.5" style={{background:"rgba(255,255,255,0.04)",borderTop:"1px solid rgba(255,255,255,0.06)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                      <div className="flex justify-between items-center">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">{selectedRecord.category} / {selectedRecord.label}</p>
                        <p className="text-[9px] font-bold opacity-30">{new Date().toLocaleDateString("en-GB", {day:"2-digit",month:"short",year:"numeric"})}</p>
                      </div>
                    </div>
                    <div className="px-8 py-3 flex justify-between items-center">
                      <div>
                        <p className="text-[7px] opacity-30 uppercase font-black tracking-widest">Client</p>
                        <h4 className="text-sm font-black">{selectedCustomer.name}</h4>
                      </div>
                      <div className="text-right">
                        <p className="text-[7px] opacity-30 uppercase font-black tracking-widest">Phone</p>
                        <p className="text-[10px] font-bold opacity-50">{selectedCustomer.phone}</p>
                      </div>
                    </div>
                    <div className="px-8 pb-5">
                      {entries.map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center py-2.5" style={{borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{k}</span>
                          <span className="text-base font-black font-mono" style={{color:theme.hexAccent}}>{v}<span className="text-[10px] opacity-40 ml-0.5">{getUnitSymbol(selectedRecord.unit)}</span></span>
                        </div>
                      ))}
                    </div>
                    <div className="px-8 py-4" style={{borderTop:`2px solid ${theme.hexAccent}22`}}>
                      <p className="text-[9px] opacity-40 italic leading-relaxed">{customNote || DEFAULT_GLOBAL_NOTE}</p>
                      <p className="text-[7px] opacity-15 uppercase tracking-widest mt-2">{businessProfile?.name || appName} · {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                )}

                {/* ══════════════════════════ LUXURY ══════════════════════════ */}
                {selectedCardStyle === "luxury" && (
                  <div className="p-8">
                    <div className="flex flex-col items-center pb-5 space-y-3">
                      {appLogo && (
                        <div className="w-20 h-20 rounded-full overflow-hidden" style={{border:`2px solid ${theme.hexAccent}60`}}>
                          <img src={appLogo} className="w-full h-full object-cover" alt="Logo" crossOrigin="anonymous" />
                        </div>
                      )}
                      <div className="text-center space-y-1.5">
                        <h2 className="text-xl font-black uppercase tracking-[0.15em]">{businessProfile?.name || appName}</h2>
                        {businessProfile?.tagline && <p className="text-[10px] italic opacity-50 tracking-wide">{businessProfile.tagline}</p>}
                      </div>
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 h-px" style={{background:`${theme.hexAccent}40`}} />
                        <div className="w-1.5 h-1.5 rotate-45" style={{background:theme.hexAccent}} />
                        <div className="flex-1 h-px" style={{background:`${theme.hexAccent}40`}} />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        {(businessProfile?.phone || socials?.whatsapp) && (
                          <div className="flex items-center gap-4 flex-wrap justify-center">
                            {businessProfile?.phone && <span className="text-[10px] opacity-55 flex items-center gap-1"><Phone size={9} />{businessProfile.phone}</span>}
                            {socials?.whatsapp && <span className="text-[10px] opacity-55 flex items-center gap-1"><MessageCircle size={9} />{socials.whatsapp}</span>}
                          </div>
                        )}
                        {addrLandmark && <p className="text-[10px] opacity-45 flex items-center gap-1"><MapPin size={9} />{addrLandmark}{addrStateCountry ? `, ${addrStateCountry}` : ""}</p>}
                        {!addrLandmark && addrStateCountry && <p className="text-[10px] opacity-35">{addrStateCountry}</p>}
                        {!addrLandmark && !addrStateCountry && businessProfile?.address && <p className="text-[10px] opacity-45 flex items-center gap-1"><MapPin size={9} />{businessProfile.address}</p>}
                      </div>
                    </div>
                    <div className="text-center py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">{selectedRecord.category}</p>
                      <p className="text-sm font-black uppercase tracking-[0.15em] mt-0.5">{selectedRecord.label}</p>
                    </div>
                    <div className="flex justify-between py-3 mb-3" style={{borderTop:`1px solid ${theme.hexAccent}25`,borderBottom:`1px solid ${theme.hexAccent}25`}}>
                      <div>
                        <p className="text-[7px] opacity-30 uppercase tracking-widest">Client</p>
                        <p className="text-sm font-black">{selectedCustomer.name}</p>
                        <p className="text-[9px] opacity-35 font-mono">#{(businessProfile?.clientIdPrefix || "OT")}-{String(selectedCustomer.id).padStart(4, "0")}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[7px] opacity-30 uppercase tracking-widest">Date</p>
                        <p className="text-[11px] font-bold">{new Date().toLocaleDateString("en-GB", {day:"2-digit",month:"short",year:"numeric"})}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-10 gap-y-5 py-4">
                      {entries.map(([k, v]) => (
                        <div key={k} className="space-y-0.5">
                          <p className="text-[8px] font-black uppercase tracking-widest opacity-28">{k}</p>
                          <p className="text-xl font-black" style={{color:theme.hexAccent}}>{v}<span className="text-[10px] opacity-35 ml-0.5">{getUnitSymbol(selectedRecord.unit)}</span></p>
                          <div className="h-px w-full" style={{background:`${theme.hexAccent}20`}} />
                        </div>
                      ))}
                    </div>
                    <div className="pt-5 flex flex-col items-center gap-3">
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 h-px" style={{background:`${theme.hexAccent}25`}} />
                        <div className="w-1.5 h-1.5 rotate-45" style={{background:`${theme.hexAccent}55`}} />
                        <div className="flex-1 h-px" style={{background:`${theme.hexAccent}25`}} />
                      </div>
                      <p className="text-[9px] opacity-35 italic text-center px-6">{customNote || DEFAULT_GLOBAL_NOTE}</p>
                      <p className="text-[7px] opacity-18 uppercase tracking-[0.3em]">{businessProfile?.name || appName}</p>
                    </div>
                  </div>
                )}

                {/* ══════════════════════════ MODERN ══════════════════════════ */}
                {selectedCardStyle === "modern" && (
                  <div>
                    <div className="px-8 pt-6 pb-4">
                      <div className="flex items-start gap-3">
                        {appLogo && (
                          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 mt-1" style={{border:`1px solid ${theme.hexAccent}30`}}>
                            <img src={appLogo} className="w-full h-full object-cover" alt="Logo" crossOrigin="anonymous" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h2 className="text-2xl font-black uppercase leading-none">{businessProfile?.name || appName}</h2>
                          {businessProfile?.tagline && <p className="text-[10px] opacity-35 mt-1 uppercase tracking-widest">{businessProfile.tagline}</p>}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {businessProfile?.phone && <span className="text-[10px] opacity-45 flex items-center gap-1"><Phone size={9} />{businessProfile.phone}</span>}
                            {socials?.whatsapp && <span className="text-[10px] opacity-45 flex items-center gap-1"><MessageCircle size={9} />{socials.whatsapp}</span>}
                          </div>
                          {addrLandmark && <p className="text-[10px] opacity-40 flex items-center gap-1 mt-1"><MapPin size={9} />{addrLandmark}{addrStateCountry ? `, ${addrStateCountry}` : ""}</p>}
                          {!addrLandmark && addrStateCountry && <p className="text-[10px] opacity-30 mt-0.5">{addrStateCountry}</p>}
                          {!addrLandmark && !addrStateCountry && businessProfile?.address && <p className="text-[10px] opacity-40 flex items-center gap-1 mt-1"><MapPin size={9} />{businessProfile.address}</p>}
                        </div>
                      </div>
                    </div>
                    <div style={{height:2,background:`linear-gradient(90deg, ${theme.hexAccent}, transparent)`}} />
                    <div className="px-8 py-3 flex justify-between items-center" style={{background:"rgba(255,255,255,0.04)"}}>
                      <div>
                        <p className="text-base font-black">{selectedCustomer.name}</p>
                        <p className="text-[9px] opacity-35 uppercase tracking-widest">{selectedRecord.category} · {selectedRecord.label}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[7px] opacity-25 uppercase tracking-widest">Generated</p>
                        <p className="text-[10px] font-bold opacity-50">{new Date().toLocaleDateString("en-GB", {day:"2-digit",month:"short",year:"numeric"})}</p>
                      </div>
                    </div>
                    <div className="px-8 py-5 grid grid-cols-2 gap-x-8 gap-y-5">
                      {entries.map(([k, v]) => (
                        <div key={k}>
                          <p className="text-[8px] font-black uppercase tracking-widest opacity-28">{k}</p>
                          <p className="text-3xl font-black leading-none mt-0.5">{v}<span className="text-sm font-bold opacity-25 ml-1">{getUnitSymbol(selectedRecord.unit)}</span></p>
                        </div>
                      ))}
                    </div>
                    <div className="px-8 py-4" style={{borderTop:"1px solid rgba(255,255,255,0.07)"}}>
                      <p className="text-[9px] opacity-30 italic">{customNote || DEFAULT_GLOBAL_NOTE}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[7px] opacity-18 uppercase tracking-widest">{businessProfile?.name || appName}</p>
                        <p className="text-[7px] font-mono opacity-15">#{(businessProfile?.clientIdPrefix || "OT")}-{String(selectedCustomer.id).padStart(4, "0")}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ══════════════════════════ MINIMAL ══════════════════════════ */}
                {selectedCardStyle === "minimal" && (
                  <div className="p-12">
                    <div className="pb-8">
                      <h2 className="text-2xl font-black uppercase tracking-[0.12em] leading-tight">{businessProfile?.name || appName}</h2>
                      {businessProfile?.tagline && <p className="text-[10px] opacity-35 italic mt-1">{businessProfile.tagline}</p>}
                      <div className="flex items-center gap-5 mt-3 flex-wrap">
                        {businessProfile?.phone && <span className="text-[10px] opacity-35">{businessProfile.phone}</span>}
                        {socials?.whatsapp && <span className="text-[10px] opacity-35">{socials.whatsapp}</span>}
                        {addrLandmark && <span className="text-[10px] opacity-35">{addrLandmark}{addrStateCountry ? `, ${addrStateCountry}` : ""}</span>}
                        {!addrLandmark && addrStateCountry && <span className="text-[10px] opacity-25">{addrStateCountry}</span>}
                        {!addrLandmark && !addrStateCountry && businessProfile?.address && <span className="text-[10px] opacity-35">{businessProfile.address}</span>}
                      </div>
                    </div>
                    <div className="h-px w-full" style={{background:"currentColor",opacity:0.12}} />
                    <div className="py-5">
                      <p className="text-[9px] opacity-25 uppercase tracking-[0.3em]">{selectedRecord.category}</p>
                      <p className="text-sm font-black uppercase tracking-widest mt-1">{selectedRecord.label}</p>
                    </div>
                    <div className="flex justify-between text-[10px] opacity-35 pb-6">
                      <span>{selectedCustomer.name}</span>
                      <span>{new Date().toLocaleDateString("en-GB", {day:"2-digit",month:"short",year:"numeric"})}</span>
                    </div>
                    <div className="space-y-5">
                      {entries.map(([k, v]) => (
                        <div key={k} className="flex justify-between items-baseline">
                          <span className="text-[10px] uppercase tracking-[0.15em] opacity-35">{k}</span>
                          <span className="text-lg font-black">{v}<span className="text-[10px] opacity-25 ml-0.5">{getUnitSymbol(selectedRecord.unit)}</span></span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-10" style={{borderTop:"1px solid currentColor",opacity:0.08}} />
                    <p className="text-[8px] opacity-18 mt-3 italic">{customNote || DEFAULT_GLOBAL_NOTE}</p>
                    <p className="text-[7px] opacity-10 uppercase tracking-widest mt-2">{businessProfile?.name || appName}</p>
                  </div>
                )}

                {/* ══════════════════════════ FASHION STUDIO ══════════════════════════ */}
                {selectedCardStyle === "fashion" && (
                  <div>
                    <div className="flex flex-col items-center pt-8 pb-5 px-8" style={{borderBottom:`1px solid ${theme.hexAccent}28`}}>
                      {appLogo && (
                        <div className="w-24 h-24 rounded-2xl overflow-hidden mb-4" style={{boxShadow:`0 0 0 1px ${theme.hexAccent}40`}}>
                          <img src={appLogo} className="w-full h-full object-cover" alt="Logo" crossOrigin="anonymous" />
                        </div>
                      )}
                      <h2 className="text-lg font-black uppercase tracking-[0.25em] text-center">{businessProfile?.name || appName}</h2>
                      {businessProfile?.tagline && <p className="text-[9px] italic opacity-45 mt-1 text-center">{businessProfile.tagline}</p>}
                      <div className="flex items-center gap-3 mt-2 flex-wrap justify-center">
                        {businessProfile?.phone && <span className="text-[9px] opacity-45">{businessProfile.phone}</span>}
                        {socials?.whatsapp && <span className="text-[9px] opacity-45">{socials.whatsapp}</span>}
                      </div>
                      {addrLandmark && <p className="text-[9px] opacity-38 mt-1 text-center">{addrLandmark}{addrStateCountry ? `, ${addrStateCountry}` : ""}</p>}
                      {!addrLandmark && addrStateCountry && <p className="text-[9px] opacity-28 text-center">{addrStateCountry}</p>}
                      {!addrLandmark && !addrStateCountry && businessProfile?.address && <p className="text-[9px] opacity-38 mt-1 text-center">{businessProfile.address}</p>}
                    </div>
                    <div className="px-8 py-3 flex items-center gap-3" style={{borderBottom:`1px solid ${theme.hexAccent}18`}}>
                      <div className="w-0.5 h-6 flex-shrink-0" style={{background:theme.hexAccent}} />
                      <div>
                        <p className="text-[8px] opacity-30 uppercase tracking-widest">{selectedRecord.category}</p>
                        <p className="text-sm font-black uppercase">{selectedRecord.label}</p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-[7px] opacity-28 uppercase tracking-widest">Client</p>
                        <p className="text-[10px] font-black">{selectedCustomer.name}</p>
                      </div>
                    </div>
                    <div className="px-8 py-5 grid grid-cols-2 gap-x-8 gap-y-4">
                      {entries.map(([k, v]) => (
                        <div key={k} className="flex items-start gap-2">
                          <div className="w-px min-h-[28px] flex-shrink-0 mt-1" style={{background:`${theme.hexAccent}35`}} />
                          <div>
                            <p className="text-[8px] uppercase tracking-widest opacity-30">{k}</p>
                            <p className="text-xl font-black leading-none">{v}<span className="text-[9px] opacity-28 ml-0.5">{getUnitSymbol(selectedRecord.unit)}</span></p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-8 py-4" style={{borderTop:`1px solid ${theme.hexAccent}18`,background:`${theme.hexAccent}06`}}>
                      <p className="text-[9px] opacity-35 italic">{customNote || DEFAULT_GLOBAL_NOTE}</p>
                      <div className="flex justify-between mt-2">
                        <p className="text-[7px] uppercase tracking-[0.3em] opacity-15">{businessProfile?.name || appName}</p>
                        <p className="text-[7px] font-mono opacity-12">#{(businessProfile?.clientIdPrefix || "OT")}-{String(selectedCustomer.id).padStart(4, "0")}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ══════════════════════════ ELEGANT ══════════════════════════ */}
                {selectedCardStyle === "elegant" && (
                  <div className="p-8">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="flex-1 h-px" style={{background:`${theme.hexAccent}30`}} />
                      <span style={{color:theme.hexAccent,fontSize:9,opacity:0.65,letterSpacing:4}}>◆ ◆ ◆</span>
                      <div className="flex-1 h-px" style={{background:`${theme.hexAccent}30`}} />
                    </div>
                    <div className="flex flex-col items-center text-center space-y-2 pb-5">
                      {appLogo && (
                        <div className="w-16 h-16 rounded-full overflow-hidden" style={{border:`1px solid ${theme.hexAccent}40`}}>
                          <img src={appLogo} className="w-full h-full object-cover" alt="Logo" crossOrigin="anonymous" />
                        </div>
                      )}
                      <h2 className="text-lg font-black uppercase tracking-[0.2em]">{businessProfile?.name || appName}</h2>
                      {businessProfile?.tagline && <p className="text-[9px] italic opacity-45">{businessProfile.tagline}</p>}
                      <div className="flex items-center gap-4 flex-wrap justify-center opacity-45 text-[10px]">
                        {businessProfile?.phone && <span className="flex items-center gap-1"><Phone size={8} />{businessProfile.phone}</span>}
                        {socials?.whatsapp && <span className="flex items-center gap-1"><MessageCircle size={8} />{socials.whatsapp}</span>}
                      </div>
                      {addrLandmark && <p className="text-[10px] opacity-38 flex items-center justify-center gap-1"><MapPin size={8} />{addrLandmark}{addrStateCountry ? `, ${addrStateCountry}` : ""}</p>}
                      {!addrLandmark && addrStateCountry && <p className="text-[10px] opacity-28 text-center">{addrStateCountry}</p>}
                      {!addrLandmark && !addrStateCountry && businessProfile?.address && <p className="text-[10px] opacity-38 flex items-center justify-center gap-1"><MapPin size={8} />{businessProfile.address}</p>}
                    </div>
                    <div className="flex items-center gap-2 my-3">
                      <div className="flex-1 h-px" style={{background:`${theme.hexAccent}20`}} />
                      <div className="w-1 h-1 rotate-45" style={{background:`${theme.hexAccent}60`}} />
                      <div className="flex-1 h-px" style={{background:`${theme.hexAccent}20`}} />
                    </div>
                    <div className="text-center py-3">
                      <p className="text-[9px] opacity-28 uppercase tracking-[0.25em]">{selectedRecord.category}</p>
                      <p className="text-sm font-black uppercase tracking-[0.1em] mt-0.5">{selectedRecord.label}</p>
                      <div className="flex justify-center gap-6 mt-2 text-[9px] opacity-35">
                        <span>{selectedCustomer.name}</span>
                        <span>·</span>
                        <span>{new Date().toLocaleDateString("en-GB", {day:"2-digit",month:"short",year:"numeric"})}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6 py-5">
                      {entries.map(([k, v]) => (
                        <div key={k} className="text-center space-y-0.5">
                          <p className="text-[8px] font-black uppercase tracking-widest opacity-28">{k}</p>
                          <p className="text-xl font-black" style={{color:theme.hexAccent}}>{v}<span className="text-[9px] opacity-35 ml-0.5">{getUnitSymbol(selectedRecord.unit)}</span></p>
                          <div className="h-px w-8 mx-auto" style={{background:`${theme.hexAccent}30`}} />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-4 mb-3">
                      <div className="flex-1 h-px" style={{background:`${theme.hexAccent}18`}} />
                      <div className="w-1 h-1 rotate-45" style={{background:`${theme.hexAccent}45`}} />
                      <div className="flex-1 h-px" style={{background:`${theme.hexAccent}18`}} />
                    </div>
                    <p className="text-[9px] opacity-28 italic text-center px-4">{customNote || DEFAULT_GLOBAL_NOTE}</p>
                    <p className="text-[7px] opacity-15 uppercase tracking-[0.3em] text-center mt-2">{businessProfile?.name || appName}</p>
                  </div>
                )}

              </div>
            </div>

            {/* ── ACTIONS ── */}
            <div className="space-y-4">

              {/* Custom note */}
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

              {/* Save + Print */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleDownload}
                  disabled={loading || sharing}
                  className="h-14 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
                  ) : (
                    <><Download size={18} /> Save To Device</>
                  )}
                </button>
                <button
                  onClick={handlePrint}
                  disabled={loading || sharing}
                  className="h-14 bg-card border border-border rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-muted transition-colors active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" /> Preparing…</>
                  ) : (
                    <><Printer size={18} /> Print Card</>
                  )}
                </button>
              </div>

              {/* Share with customer — always shown, smart fallback */}
              <button
                onClick={handleShareToCustomer}
                disabled={sharing || loading}
                className="w-full h-14 bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-500/20 transition-colors active:scale-[0.98] disabled:opacity-50"
              >
                {sharing ? (
                  <><span className="w-4 h-4 border-2 border-green-500/40 border-t-green-500 rounded-full animate-spin" /> Preparing…</>
                ) : (
                  <><Share2 size={18} /> Share with {selectedCustomer.name}</>
                )}
              </button>

              {/* Invite */}
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
