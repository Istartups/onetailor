import { useEffect, useState } from "react";
import {
  Crown, Shield, Smartphone, Plus, ChevronRight, Check,
  Users, Palette, Zap, Video, Database, ShieldCheck, LogIn
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useLocation } from "wouter";

export default function PremiumActivated() {
  const isPremium           = useAppStore((s) => s.isPremium);
  const account             = useAppStore((s) => s.account);
  const selectedDeviceCount = useAppStore((s) => s.selectedDeviceCount);

  const [, navigate] = useLocation();
  const [licenseData, setLicenseData] = useState<{
    activatedAt?: string;
    method?: string;
    deviceLimit?: number;
  }>({});

  useEffect(() => {
    if (!isPremium) { navigate("/premium-details"); return; }
    const token = localStorage.getItem("user_token");
    if (token) {
      fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          if (d.license) {
            setLicenseData({
              activatedAt: d.license.createdAt || d.license.activatedAt,
              method: d.license.method || "—",
              deviceLimit: d.license.deviceLimit || selectedDeviceCount,
            });
          }
        })
        .catch(() => {});
    }
  }, [isPremium]);

  if (!isPremium) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
        <LogIn size={48} className="mx-auto text-muted-foreground/30" />
        <p className="text-muted-foreground">You don't have an active premium membership.</p>
        <button onClick={() => navigate("/premium-details")} className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold">
          Get Premium
        </button>
      </div>
    );
  }

  const formatDate = (d?: string) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
    } catch { return "—"; }
  };

  const formatTime = (d?: string) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
    } catch { return "—"; }
  };

  const devicesOwned = licenseData.deviceLimit || selectedDeviceCount || 1;

  return (
    <div className="max-w-xl mx-auto px-4 pb-24 pt-6 space-y-6">

      {/* Hero */}
      <div className="relative overflow-hidden px-6 py-10 rounded-3xl bg-slate-950 border border-primary/30 shadow-2xl text-center space-y-4">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative">
          <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto border-2 border-primary/40 mb-4">
            <Crown size={40} className="text-primary" />
          </div>
          <h1 className="text-3xl font-black text-white">👑 Premium Active</h1>
          <p className="text-slate-400 text-sm mt-2">
            You now have exclusive access to advanced tailoring tools reserved for premium professionals.
          </p>
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-500/15 border border-emerald-500/30 rounded-full">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">License Active</span>
          </div>
        </div>
      </div>

      {/* Membership Details */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/20">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Premium Membership Details</p>
        </div>
        <div className="divide-y divide-border/50">
          {[
            { label: "Account",          value: account?.email || "—", icon: ShieldCheck },
            { label: "Business",         value: account?.businessName || "—", icon: Users },
            { label: "Payment Date",     value: formatDate(licenseData.activatedAt), icon: Shield },
            { label: "Payment Time",     value: formatTime(licenseData.activatedAt), icon: Shield },
            { label: "Devices Licensed", value: `${devicesOwned} Device${devicesOwned !== 1 ? "s" : ""}`, icon: Smartphone },
            { label: "License Status",   value: "Active", icon: Check, highlight: true },
          ].map(({ label, value, icon: Icon, highlight }) => (
            <div key={label} className="flex items-center gap-4 px-5 py-3.5">
              <Icon size={15} className={highlight ? "text-emerald-500" : "text-muted-foreground"} />
              <span className="text-xs text-muted-foreground flex-1">{label}</span>
              <span className={`text-xs font-bold ${highlight ? "text-emerald-500" : "text-foreground"}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Device security notice */}
      <div className="p-5 bg-primary/5 border border-primary/15 rounded-3xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <Smartphone size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold">Device Activation Control</p>
            <p className="text-xs text-muted-foreground">Your premium access is protected.</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your membership is linked to your account. Access is available on{" "}
          <span className="font-bold text-primary">{devicesOwned} authorised device{devicesOwned !== 1 ? "s" : ""}</span>{" "}
          at a time. To use Premium on more devices, expand your license below.
        </p>
      </div>

      {/* Add More Devices */}
      <button
        onClick={() => navigate("/premium-details")}
        className="w-full p-5 bg-card border-2 border-dashed border-border rounded-3xl flex items-center gap-4 hover:border-primary/40 transition-all active:scale-[0.98] group"
      >
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
          <Plus size={24} />
        </div>
        <div className="text-left flex-1">
          <p className="font-bold text-sm">Add More Devices</p>
          <p className="text-xs text-muted-foreground mt-0.5">Expand your license to cover more devices</p>
        </div>
        <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
      </button>

      {/* Features reminder */}
      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Your Premium Includes</p>
        {[
          { icon: Users,    label: "Unlimited Client Database" },
          { icon: Palette,  label: "Professional Brand Kit & Measurement Cards" },
          { icon: Zap,      label: "Payment Collection & Invoicing" },
          { icon: Shield,   label: "Customer Notes & Full History" },
          { icon: Database, label: "Multi-Device License Access" },
          { icon: Video,    label: "Priority Customer Support" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border">
            <Icon size={14} className="text-primary shrink-0" />
            <span className="text-sm font-medium flex-1">{label}</span>
            <Check size={13} className="text-emerald-500 shrink-0" />
          </div>
        ))}
      </div>

      <button onClick={() => navigate("/home")} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2">
        <Zap size={18} /> Go to Toolkit
      </button>
    </div>
  );
}
