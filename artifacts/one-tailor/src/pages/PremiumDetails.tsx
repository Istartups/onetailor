import { useState, useEffect } from "react";
import {
  Crown, Loader2, Check, Users, Palette, Zap, Video, ShieldCheck, Database,
  LogIn, ChevronRight, Star, Smartphone
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const PREMIUM_FEATURES = [
  { title: "Unlimited Client Database",  desc: "Store unlimited customers and their complete measurement history — no cap, ever.",                   icon: Users },
  { title: "Cloud Backup & Restore",     desc: "Export all your customers, measurements, and notes as a backup file you can restore anytime.",       icon: Database },
  { title: "Multi-Device Access",        desc: "Log in with your email on any phone or tablet and your full data is always synced and waiting.",      icon: Smartphone },
  { title: "Custom Measurement Templates", desc: "Create and save your own measurement templates for any garment type your workshop handles.",       icon: Zap },
  { title: "Professional BrandKit",      desc: "Set your business logo, colours, and name — every receipt and card reflects your brand.",            icon: Palette },
  { title: "Push Notification Alerts",   desc: "Receive important updates and announcements directly on your device even when the app is closed.",   icon: ShieldCheck },
  { title: "Priority Support",           desc: "Get dedicated help from the OneTailor team whenever you need assistance or have questions.",          icon: LogIn },
];

interface PaymentSettings {
  price: number;
  price2Device?: number;
  price3Device?: number;
  price5Device?: number;
  currencyCode?: string;
  currencySymbol?: string;
  isPaystackEnabled: boolean;
  isManualEnabled: boolean;
}

const DEVICE_TIERS = [
  { count: 1, label: "1 Device",   sub: "Just you" },
  { count: 2, label: "2 Devices",  sub: "You + 1 more" },
  { count: 3, label: "3 Devices",  sub: "Small team" },
  { count: 5, label: "5 Devices",  sub: "Full workshop", badge: "BEST" },
];

export default function PremiumDetails() {
  const account              = useAppStore((s) => s.account);
  const isPremium            = useAppStore((s) => s.isPremium);
  const selectedDeviceCount  = useAppStore((s) => s.selectedDeviceCount);
  const setSelectedDeviceCount = useAppStore((s) => s.setSelectedDeviceCount);

  const { toast }    = useToast();
  const [, navigate] = useLocation();

  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (isPremium) { navigate("/premium-activated"); return; }
    fetch("/api/payment-info")
      .then(r => r.json())
      .then(d => setSettings(d))
      .catch(() => toast({ title: "Error", description: "Could not load payment info.", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [isPremium]);

  const priceForCount = (count: number): number => {
    if (!settings) return 0;
    if (count === 2) return settings.price2Device || settings.price;
    if (count === 3) return settings.price3Device || settings.price;
    if (count === 5) return settings.price5Device || settings.price;
    return settings.price;
  };

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: settings?.currencyCode || "NGN", maximumFractionDigits: 0 })
      .format(p)
      .replace(settings?.currencyCode || "NGN", settings?.currencySymbol || "₦");

  const effectivePrice = priceForCount(selectedDeviceCount);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading premium details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 pb-24 pt-6 space-y-6">

      {/* Hero Banner */}
      <div className="relative overflow-hidden px-6 py-10 rounded-3xl bg-slate-950 border border-primary/20 shadow-2xl">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative text-center space-y-3">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto border border-primary/40">
            <Crown size={32} className="text-primary" />
          </div>
          <div className="flex items-center justify-center gap-1 text-primary/80">
            {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
          </div>
          <h1 className="text-3xl font-bold text-white"> Unlock Premium</h1>
          <p className="text-slate-400 text-sm">Professional tools for serious tailors.</p>
          <div className="text-4xl font-black text-primary transition-all duration-300">
            {settings ? formatPrice(effectivePrice) : "₦15,000"}
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            One-time payment · Lifetime access · No subscriptions
          </p>
        </div>
      </div>

      {/* Device Tier Selector */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone size={14} className="text-muted-foreground" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Choose Your Device Plan</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {DEVICE_TIERS.map(({ count, label, sub, badge }) => {
            const price    = priceForCount(count);
            const selected = selectedDeviceCount === count;
            return (
              <button
                key={count}
                onClick={() => setSelectedDeviceCount(count)}
                className={`relative flex flex-col items-center justify-center gap-1 py-4 px-1 rounded-2xl border-2 transition-all active:scale-95 text-center ${
                  selected
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                    : "bg-card border-border hover:border-primary/40"
                }`}
              >
                {badge && (
                  <span className={`absolute -top-2 right-1 text-[8px] font-black px-1.5 py-0.5 rounded-full ${selected ? "bg-white text-primary" : "bg-amber-500/15 text-amber-600 border border-amber-500/20"}`}>
                    {badge}
                  </span>
                )}
                <span className="text-[10px] font-black">{label}</span>
                <span className={`text-[9px] ${selected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{sub}</span>
                <span className={`text-[10px] font-bold mt-0.5 ${selected ? "text-primary-foreground" : "text-primary"}`}>
                  {settings ? formatPrice(price) : "—"}
                </span>
                {selected && <Check size={12} className="text-primary-foreground mt-0.5" />}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          {selectedDeviceCount > 1
            ? `${selectedDeviceCount} devices share one license — log in with your email on each.`
            : "Use premium on 1 device. Upgrade anytime to add more."}
        </p>
      </div>

      {/* CTA */}
      <div className="space-y-3 pt-2">
        {!account ? (
          <>
            <div className="p-4 bg-primary/5 border border-primary/15 rounded-2xl text-center space-y-2">
              <p className="text-sm font-semibold">Create a free account to proceed</p>
              <p className="text-xs text-muted-foreground">Takes under 2 minutes. Your account lets you restore access on any device.</p>
            </div>
            <button
              onClick={() => navigate("/pre-unlock")}
              className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-base shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              Get Started — Create Account <ChevronRight size={18} />
            </button>
            <button
              onClick={() => navigate("/account-login")}
              className="w-full py-2 text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2"
            >
              <LogIn size={14} /> Already have an account? Login
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-1.5 bg-emerald-500/10 text-emerald-500 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-500/20 w-fit mx-auto">
              <Check size={12} /> Logged in as: {account.email}
            </div>
            {!settings?.isPaystackEnabled && !settings?.isManualEnabled ? (
              <div className="p-5 text-center text-sm text-muted-foreground bg-muted/20 rounded-3xl border border-border">
                Payment methods are currently unavailable. Please check back soon.
              </div>
            ) : (
              <button
                onClick={() => navigate("/payment-method")}
                className="w-full py-5 bg-primary text-primary-foreground rounded-2xl font-bold text-lg shadow-xl shadow-primary/25 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
              >
                <Crown size={22} />
                Choose Payment Method
                <ChevronRight size={20} />
              </button>
            )}
            <p className="text-[10px] text-center text-muted-foreground">
              Secure · One-time · No hidden charges
            </p>
          </>
        )}
      </div>

      {/* Features */}
      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1 mb-3">What you get</p>
        {PREMIUM_FEATURES.map((f, i) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <f.icon size={20} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-bold">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{f.desc}</p>
            </div>
            <Check size={15} className="text-emerald-500 shrink-0 mt-1 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
