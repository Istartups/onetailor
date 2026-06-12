import { 
  Moon, Sun, Trash2, Info, Crown, Download, Upload,
  Monitor, Palette, Save, ShieldCheck, User, Settings as SettingsIcon, Database, 
  Smartphone, Mail, Phone, Instagram, Facebook,
  Pipette, Loader2
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { validateName, validatePhone } from "@/lib/utils";

const APP_VERSION = "2.0.0";

type SettingsTab = "general" | "brandkit" | "backup" | "appearance" | "about";

function compressImageToBase64(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No canvas")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png", 0.9));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Load failed")); };
    img.src = url;
  });
}

// Simple color extraction from image
async function extractColorsFromImage(base64: string): Promise<{ primary: string; secondary: string; accent: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve({ primary: "#0f0f0f", secondary: "#d4a020", accent: "#f5d76e" }); return; }
      
      canvas.width = 50; // Small size for faster processing
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);
      
      const data = ctx.getImageData(0, 0, 50, 50).data;
      const colors: Record<string, number> = {};
      
      for (let i = 0; i < data.length; i += 20) { // Sample pixels
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        colors[hex] = (colors[hex] || 0) + 1;
      }
      
      const sorted = Object.entries(colors).sort((a, b) => b[1] - a[1]);
      const primary = sorted[0]?.[0] || "#0f0f0f";
      const secondary = sorted[1]?.[0] || "#d4a020";
      const accent = sorted[2]?.[0] || "#f5d76e";
      
      resolve({ primary, secondary, accent });
    };
    img.src = base64;
  });
}

export default function Settings() {
  const darkMode = useAppStore((s) => s.darkMode);
  const setDarkMode = useAppStore((s) => s.setDarkMode);
  const isPremium = useAppStore((s) => s.isPremium);
  const clearData = useAppStore((s) => s.clearData);
  const appName = useAppStore((s) => s.appName);
  const appLogo = useAppStore((s) => s.appLogo);
  const splashImage = useAppStore((s) => s.splashImage);
  const businessProfile = useAppStore((s) => s.businessProfile);
  const setBusinessProfile = useAppStore((s) => s.setBusinessProfile);
  const setAppName = useAppStore((s) => s.setAppName);
  const setAppLogo = useAppStore((s) => s.setAppLogo);
  const setSplashImage = useAppStore((s) => s.setSplashImage);
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>("brandkit");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Brand Kit State
  const [brandForm, setBrandForm] = useState({
    name: businessProfile?.name || appName || "",
    phone: businessProfile?.phone || "",
    email: businessProfile?.email || "",
    street: businessProfile?.addressDetails?.street || "",
    city: businessProfile?.addressDetails?.city || "",
    state: businessProfile?.addressDetails?.state || "",
    landmark: businessProfile?.addressDetails?.landmark || "",
    country: businessProfile?.addressDetails?.country || "Nigeria",
    instagram: businessProfile?.socials?.instagram || "",
    facebook: businessProfile?.socials?.facebook || "",
    whatsapp: businessProfile?.socials?.whatsapp || "",
    tiktok: businessProfile?.socials?.tiktok || "",
    youtube: businessProfile?.socials?.youtube || "",
    primaryColor: businessProfile?.brandColors?.primary || "#0f0f0f",
    secondaryColor: businessProfile?.brandColors?.secondary || "#d4a020",
    accentColor: businessProfile?.brandColors?.accent || "#f5d76e"
  });

  const [logoInput, setLogoInput] = useState<string | null>(appLogo);
  const [splashInput, setSplashInput] = useState<string | null>(splashImage);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSplash, setUploadingSplash] = useState(false);
  const [extracting, setExtracting] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const splashInputRef = useRef<HTMLInputElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null); // kept for smooth scroll on small viewports

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const maskKey = (key: string) => {
    if (!key) return "";
    if (key.length <= 8) return "****" + key.slice(-4);
    return key.slice(0, 4) + " **** " + key.slice(-4);
  };

  const handleClearData = () => {
    if (!showClearConfirm) { setShowClearConfirm(true); return; }
    clearData();
    setShowClearConfirm(false);
    toast({ title: "Data cleared", description: "All local data has been removed." });
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploadingLogo(true);
    try {
      const b64 = await compressImageToBase64(file, 512);
      setLogoInput(b64);
      
      // Auto-extract colors for premium users
      if (isPremium) {
        setExtracting(true);
        const colors = await extractColorsFromImage(b64);
        setBrandForm(prev => ({
          ...prev,
          primaryColor: colors.primary,
          secondaryColor: colors.secondary,
          accentColor: colors.accent
        }));
        setExtracting(false);
        toast({ title: "Colors Extracted", description: "Brand colors updated from logo." });
      }
    } catch {
      toast({ title: "Failed to load image", variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSplashUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploadingSplash(true);
    try {
      const b64 = await compressImageToBase64(file, 1080);
      setSplashInput(b64);
    } catch {
      toast({ title: "Failed to load image", variant: "destructive" });
    } finally {
      setUploadingSplash(false);
    }
  };

  const handleSaveBrandKit = () => {
    const nameVal = validateName(brandForm.name);
    if (!nameVal.valid) { toast({ title: "Invalid Name", description: nameVal.message, variant: "destructive" }); return; }
    
    const phoneVal = validatePhone(brandForm.phone);
    if (!phoneVal.valid) { toast({ title: "Invalid Phone", description: phoneVal.message, variant: "destructive" }); return; }

    const combinedAddress = `${brandForm.street ? brandForm.street + ', ' : ''}${brandForm.city}, ${brandForm.state}${brandForm.landmark ? ' (Near ' + brandForm.landmark + ')' : ''}, ${brandForm.country}`;

    // Save to store
    setAppName(brandForm.name.trim());
    setAppLogo(logoInput);
    setSplashImage(splashInput);
    
    setBusinessProfile({
      name: brandForm.name,
      phone: brandForm.phone,
      email: brandForm.email,
      address: combinedAddress,
      addressDetails: {
        street: brandForm.street,
        city: brandForm.city,
        state: brandForm.state,
        landmark: brandForm.landmark,
        country: brandForm.country
      },
      socials: {
        instagram: brandForm.instagram,
        facebook: brandForm.facebook,
        whatsapp: brandForm.whatsapp,
        tiktok: brandForm.tiktok,
        youtube: brandForm.youtube
      },
      brandColors: {
        primary: brandForm.primaryColor,
        secondary: brandForm.secondaryColor,
        accent: brandForm.accentColor
      }
    });

    document.title = brandForm.name.trim();
    toast({ title: "Brand Kit Saved!", description: "Your business identity has been updated." });
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else {
      toast({
        title: "Install OneTailor",
        description: 'Tap your browser menu (three dots or share icon) and select "Add to Home Screen" or "Install App".',
      });
    }
  };

  const cardStyle = { background: "hsl(218,44%,11%)", border: "1px solid hsl(218,38%,18%)" };
  const inputStyle = { background: "hsl(218,44%,13%)", borderColor: "hsl(218,38%,22%)", color: "hsl(43,25%,88%)" };

  return (
    <div className="max-w-xl mx-auto pb-20">
      <PageHeader title="Settings" backPath="/home" />

      {/* Tabs Navigation */}
      <div className="relative sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div ref={tabsRef} className="flex overflow-x-auto gap-1 px-4 py-2 no-scrollbar">
          {[
            { id: "brandkit",   label: "Brand Kit",  icon: Palette },
            { id: "general",    label: "General",    icon: SettingsIcon },
            { id: "appearance", label: "Display",    icon: Monitor },
            { id: "backup",     label: "Backup",     icon: Database },
            { id: "about",      label: "About",      icon: Info },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted"}`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 space-y-6">

        {/* 1. BRAND KIT TAB */}
        {activeTab === "brandkit" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-card border border-border rounded-3xl p-6 space-y-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Palette size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg">Business Identity</h3>
                  <p className="text-xs text-muted-foreground font-medium">Configure your professional branding</p>
                </div>
              </div>

              {/* Logo & Splash */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Logo</label>
                  <div 
                    onClick={() => logoInputRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/30 transition-all overflow-hidden relative group"
                  >
                    {logoInput ? (
                      <>
                        <img src={logoInput} className="w-full h-full object-contain p-2" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Upload size={20} className="text-white" />
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload size={20} className="text-muted-foreground" />
                        <span className="text-[9px] font-bold text-muted-foreground">UPLOAD</span>
                      </>
                    )}
                  </div>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ""; }} />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Splash Screen</label>
                  <div 
                    onClick={() => splashInputRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/30 transition-all overflow-hidden relative group"
                  >
                    {splashInput ? (
                      <>
                        <img src={splashInput} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Monitor size={20} className="text-white" />
                        </div>
                      </>
                    ) : (
                      <>
                        <Monitor size={20} className="text-muted-foreground" />
                        <span className="text-[9px] font-bold text-muted-foreground">UPLOAD</span>
                      </>
                    )}
                  </div>
                  <input ref={splashInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleSplashUpload(f); e.target.value = ""; }} />
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Business Name *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={16} />
                    <input 
                      type="text" 
                      placeholder="e.g. Royal Stitches" 
                      value={brandForm.name} 
                      onChange={e => setBrandForm({...brandForm, name: e.target.value})} 
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-muted/30 border border-border outline-none focus:border-primary font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Business Phone *</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={16} />
                      <input 
                        type="tel" 
                        placeholder="e.g. +234..." 
                        value={brandForm.phone} 
                        onChange={e => setBrandForm({...brandForm, phone: e.target.value})} 
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-muted/30 border border-border outline-none focus:border-primary font-bold text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email (Optional)</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={16} />
                      <input 
                        type="email" 
                        placeholder="business@example.com" 
                        value={brandForm.email} 
                        onChange={e => setBrandForm({...brandForm, email: e.target.value})} 
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-muted/30 border border-border outline-none focus:border-primary font-bold text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Location Details</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Street / Bus Stop</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 12 Fashion Ave" 
                        value={brandForm.street} 
                        onChange={e => setBrandForm({...brandForm, street: e.target.value})} 
                        className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border outline-none focus:border-primary text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">City *</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Ikeja" 
                        value={brandForm.city} 
                        onChange={e => setBrandForm({...brandForm, city: e.target.value})} 
                        className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border outline-none focus:border-primary text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">State *</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Lagos" 
                        value={brandForm.state} 
                        onChange={e => setBrandForm({...brandForm, state: e.target.value})} 
                        className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border outline-none focus:border-primary text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Landmark</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Near City Mall" 
                        value={brandForm.landmark} 
                        onChange={e => setBrandForm({...brandForm, landmark: e.target.value})} 
                        className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border outline-none focus:border-primary text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Country *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Nigeria" 
                      value={brandForm.country} 
                      onChange={e => setBrandForm({...brandForm, country: e.target.value})} 
                      className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border outline-none focus:border-primary text-sm"
                    />
                  </div>
                </div>

                {/* Social Handles */}
                <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Social Media</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500" size={16} />
                      <input 
                        type="text" 
                        placeholder="Instagram handle" 
                        value={brandForm.instagram} 
                        onChange={e => setBrandForm({...brandForm, instagram: e.target.value})} 
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-muted/30 border border-border outline-none focus:border-primary text-xs"
                      />
                    </div>
                    <div className="relative">
                      <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={16} />
                      <input 
                        type="text" 
                        placeholder="Facebook page" 
                        value={brandForm.facebook} 
                        onChange={e => setBrandForm({...brandForm, facebook: e.target.value})} 
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-muted/30 border border-border outline-none focus:border-primary text-xs"
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-black dark:text-white flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.84 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                      </div>
                      <input 
                        type="text" 
                        placeholder="TikTok handle" 
                        value={brandForm.tiktok} 
                        onChange={e => setBrandForm({...brandForm, tiktok: e.target.value})} 
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-muted/30 border border-border outline-none focus:border-primary text-xs"
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-red-600">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.016 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                      </div>
                      <input 
                        type="text" 
                        placeholder="YouTube channel" 
                        value={brandForm.youtube} 
                        onChange={e => setBrandForm({...brandForm, youtube: e.target.value})} 
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-muted/30 border border-border outline-none focus:border-primary text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Brand Colors (Premium) */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                      Brand Colors {isPremium ? <ShieldCheck size={12} className="text-emerald-500" /> : <Crown size={12} className="text-primary" />}
                    </label>
                    {isPremium && (
                      <button 
                        onClick={() => logoInput && handleLogoUpload(new File([], ""))} // Trigger re-extraction
                        className="text-[10px] font-bold text-primary flex items-center gap-1 active:scale-95"
                      >
                        {extracting ? <Loader2 size={10} className="animate-spin" /> : <Pipette size={10} />}
                        Re-extract
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {([
                      { key: "primaryColor",   label: "Primary",   value: brandForm.primaryColor },
                      { key: "secondaryColor", label: "Secondary", value: brandForm.secondaryColor },
                      { key: "accentColor",    label: "Accent",    value: brandForm.accentColor },
                    ] as { key: "primaryColor" | "secondaryColor" | "accentColor"; label: string; value: string }[]).map(({ key, label, value }) => (
                      <div key={key} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border">
                        <div className="w-10 h-10 rounded-xl flex-shrink-0 border border-border/50" style={{ background: value }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold">{label} Color</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{value}</p>
                        </div>
                        <input
                          type="color"
                          disabled={!isPremium}
                          value={value}
                          onChange={e => setBrandForm({ ...brandForm, [key]: e.target.value })}
                          className={`w-9 h-9 rounded-xl border-none bg-transparent flex-shrink-0 ${isPremium ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
                          title={!isPremium ? "Unlock Premium to customize" : `Change ${label} color`}
                        />
                      </div>
                    ))}
                  </div>
                  {!isPremium && (
                    <p className="text-[9px] text-primary font-bold text-center">Unlock Premium to customize and auto-extract brand colors!</p>
                  )}
                </div>

                <button
                  onClick={handleSaveBrandKit}
                  className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-primary/20 transition-all active:scale-[0.98] bg-primary text-primary-foreground"
                >
                  <Save className="w-4 h-4" /> Save Brand Kit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. GENERAL TAB */}
        {activeTab === "general" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-card border border-border rounded-3xl overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">System & Support</p>
              </div>
              <button onClick={() => setLocation("/pre-unlock")} className="w-full flex items-center justify-between px-6 py-5 border-b border-border hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">License Status</p>
                    <p className="text-xs text-muted-foreground font-medium">{isPremium ? "Premium Active" : "Free Version (Basic Tools)"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isPremium && <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full uppercase tracking-widest border border-emerald-500/20">👑 PREMIUM</span>}
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </button>

              <button onClick={handleInstall} className="w-full flex items-center justify-between px-6 py-5 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                    <Smartphone size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">App Installation</p>
                    <p className="text-xs text-muted-foreground font-medium">Install OneTailor for offline use</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {deferredPrompt && <span className="text-[9px] font-black bg-primary/20 text-primary px-2 py-1 rounded-full uppercase tracking-widest">Available</span>}
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 3. DISPLAY TAB */}
        {activeTab === "appearance" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-card border border-border rounded-3xl overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">App Appearance</p>
              </div>
              <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-500"}`}>
                    {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Dark Mode</p>
                    <p className="text-xs text-muted-foreground font-medium">{darkMode ? "Eye-friendly dark theme" : "Standard light theme"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="w-12 h-6 rounded-full transition-colors relative"
                  style={{ background: darkMode ? "hsl(var(--primary))" : "hsl(var(--muted))" }}
                >
                  <span
                    className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
                    style={{ transform: darkMode ? "translateX(24px)" : "translateX(0)" }}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. BACKUP TAB */}
        {activeTab === "backup" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="bg-card border border-border rounded-3xl p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center text-muted-foreground">
                   <Database size={32} />
                </div>
                <div className="space-y-1">
                   <h3 className="font-bold">Data Management</h3>
                   <p className="text-xs text-muted-foreground px-4">Import or export your client database and settings</p>
                </div>
                {!isPremium && (
                   <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                      <p className="text-[10px] font-bold text-primary">👑 Premium users get automatic cloud backup and priority support!</p>
                   </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-2">
                   <button className="flex items-center justify-center gap-2 py-3 bg-muted hover:bg-muted/80 rounded-xl text-xs font-bold transition-all"><Download size={14} /> Export</button>
                   <button className="flex items-center justify-center gap-2 py-3 bg-muted hover:bg-muted/80 rounded-xl text-xs font-bold transition-all"><Upload size={14} /> Import</button>
                </div>
             </div>

             <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-4 ml-1">Danger Zone</p>
                <button 
                  onClick={handleClearData} 
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${showClearConfirm ? "bg-red-500 text-white" : "bg-red-500/10 text-red-500"}`}
                >
                  <div className="flex items-center gap-3">
                    <Trash2 size={18} />
                    <div className="text-left">
                      <p className="text-xs font-black uppercase tracking-widest">{showClearConfirm ? "TAP TO CONFIRM" : "CLEAR ALL DATA"}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} />
                </button>
             </div>
          </div>
        )}

        {/* 5. ABOUT TAB */}
        {activeTab === "about" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="text-center space-y-4 py-8">
                <div className="w-24 h-24 rounded-3xl bg-card border border-border shadow-xl mx-auto flex items-center justify-center p-4">
                   <img src="/onetailor-logo.png" className="w-full h-full object-contain" />
                </div>
                <div>
                   <h2 className="text-2xl font-black tracking-tight">OneTailor</h2>
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Tailors Toolkit</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                   <span className="text-xs font-bold text-muted-foreground">Version {APP_VERSION}</span>
                   <span className="text-[10px] font-medium text-muted-foreground/50">© 2026 OneTailor Digital Services</span>
                </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
