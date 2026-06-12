import { useState, useRef } from "react";
import { Upload, Download, X, Check, Crown, ImageIcon, Zap, Loader2, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { PremiumBadge, PremiumLockedOverlay } from "@/components/shared/PremiumBadge";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const FORMATS = [
  { id: "whatsapp-status",  label: "WhatsApp Status",   w: 1080, h: 1920, desc: "9:16 · Vertical" },
  { id: "instagram-post",   label: "Instagram Post",    w: 1080, h: 1080, desc: "1:1 · Square" },
  { id: "instagram-story",  label: "Instagram Story",   w: 1080, h: 1920, desc: "9:16 · Vertical" },
  { id: "facebook-post",    label: "Facebook Post",     w: 940,  h: 788,  desc: "6:5 · Landscape" },
  { id: "twitter-post",     label: "Twitter / X Post",  w: 1200, h: 675,  desc: "16:9 · Wide" },
];

type FitMode = "contain" | "cover";
type BgStyle = "color" | "blur" | "dominant";

async function drawFlyerToCanvas(
  src: HTMLImageElement, w: number, h: number, fitMode: FitMode,
  bgColor: string, bgStyle: BgStyle,
  frameImg: HTMLImageElement | null
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const imgAR = src.naturalWidth / src.naturalHeight;
  const canvasAR = w / h;

  let dw: number, dh: number, dx: number, dy: number;
  if (fitMode === "contain") {
    if (imgAR > canvasAR) {
      dw = w; dh = w / imgAR; dx = 0; dy = (h - dh) / 2;
    } else {
      dh = h; dw = h * imgAR; dx = (w - dw!) / 2; dy = 0;
    }
  } else {
    // cover
    if (imgAR > canvasAR) {
      dh = h; dw = h * imgAR; dx = (w - dw!) / 2; dy = 0;
    } else {
      dw = w; dh = w / imgAR; dx = 0; dy = (h - dh!) / 2;
    }
  }

  if (fitMode === "contain") {
    if (bgStyle === "blur") {
      // Draw blurred full-cover version as background
      let bw: number, bh: number, bx: number, by: number;
      if (imgAR > canvasAR) {
        bh = h; bw = h * imgAR; bx = (w - bw) / 2; by = 0;
      } else {
        bw = w; bh = w / imgAR; bx = 0; by = (h - bh) / 2;
      }
      ctx.filter = "blur(24px) brightness(0.6)";
      ctx.drawImage(src, bx - 40, by - 40, bw + 80, bh + 80);
      ctx.filter = "none";
    } else if (bgStyle === "dominant") {
      // Sample dominant color from center of image
      const sampleCanvas = document.createElement("canvas");
      sampleCanvas.width = 10; sampleCanvas.height = 10;
      const sc = sampleCanvas.getContext("2d")!;
      sc.drawImage(src, 0, 0, 10, 10);
      const d = sc.getImageData(4, 4, 2, 2).data;
      const r = Math.round((d[0] + d[4]) / 2);
      const g = Math.round((d[1] + d[5]) / 2);
      const b = Math.round((d[2] + d[6]) / 2);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
    }
  } else {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, w, h);
  }

  ctx.drawImage(src, dx, dy, dw, dh);

  // Apply frame overlay
  if (frameImg) {
    ctx.drawImage(frameImg, 0, 0, w, h);
  }

  return canvas;
}

export default function FlyerResizer() {
  const { toast } = useToast();
  const isPremium = useAppStore((s) => s.isPremium);
  const incrementUsage = useAppStore((s) => s.incrementUsage);
  const [, setLocation] = useLocation();
  const [flyerUrl, setFlyerUrl] = useState<string | null>(null);
  const [flyerImg, setFlyerImg] = useState<HTMLImageElement | null>(null);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [frameImg, setFrameImg] = useState<HTMLImageElement | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set(["whatsapp-status", "instagram-post"]));
  const [fitMode, setFitMode] = useState<FitMode>("contain");
  const [bgStyle, setBgStyle] = useState<BgStyle>("color");
  const [bgColor, setBgColor] = useState("#111111");
  const [generating, setGenerating] = useState(false);
  const [previews, setPreviews] = useState<{ id: string; url: string; label: string }[]>([]);
  const fileRef  = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLInputElement>(null);

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setFlyerUrl(dataUrl);
      const img = new Image();
      img.onload = () => setFlyerImg(img);
      img.src = dataUrl;
      setPreviews([]); // Reset previews on new upload
    };
    reader.readAsDataURL(file);
  };

  const handleFrameUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setFrameUrl(dataUrl);
      const img = new Image();
      img.onload = () => setFrameImg(img);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const toggleFormat = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const handleGenerate = async () => {
    if (!flyerImg || selected.size === 0) return;
    setGenerating(true);
    const newPreviews: { id: string; url: string; label: string }[] = [];
    try {
      for (const fmt of FORMATS.filter((f) => selected.has(f.id))) {
        const canvas = await drawFlyerToCanvas(flyerImg, fmt.w, fmt.h, fitMode, bgColor, bgStyle, frameImg);
        newPreviews.push({
          id: fmt.id,
          url: canvas.toDataURL("image/jpeg", 0.94),
          label: fmt.label
        });
      }
      setPreviews(newPreviews);
      await incrementUsage();
      toast({ title: "Generated!", description: `${selected.size} size${selected.size > 1 ? "s" : ""} ready for preview.` });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAll = () => {
    previews.forEach(p => {
      const a = document.createElement("a");
      a.href = p.url;
      a.download = `flyer-${p.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
    toast({ title: "Saved!", description: "All flyers saved to your device." });
  };

  const card = "bg-card border border-border rounded-3xl p-6 shadow-sm";

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <PageHeader 
        title="Flyer Resizer" 
        subtitle="Resize flyers for every platform instantly" 
        backPath="/all-tools?cat=marketing"
        backLabel="Marketing Tools"
      />
      <div className="px-4 py-5 space-y-4">

        {/* Upload */}
        {!flyerUrl ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all active:scale-[0.99] border-2 border-dashed border-primary/30 bg-primary/5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary/10 border border-primary/20">
              <Upload size={26} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="font-bold text-foreground">Upload Your Flyer</p>
              <p className="text-sm text-muted-foreground mt-1">JPG, PNG · Tap or drag to upload</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
          </div>
        ) : (
          <div className="relative rounded-2xl overflow-hidden border border-border bg-card">
            <img src={flyerUrl} alt="Flyer" className="w-full max-h-48 object-contain" />
            <button
              onClick={() => { setFlyerUrl(null); setFlyerImg(null); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-black/60">
              <X size={14} className="text-white" />
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="absolute bottom-2 right-2 text-xs px-2.5 py-1 rounded-lg font-medium bg-primary text-primary-foreground">
              Change
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
          </div>
        )}

        {/* Format selection */}
        <div className={card + " space-y-3"}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Output Formats</label>
            <button
              onClick={() => selected.size === FORMATS.length ? setSelected(new Set()) : setSelected(new Set(FORMATS.map(f => f.id)))}
              className="text-xs font-semibold px-2 py-1 rounded-lg bg-primary/10 text-primary">
              {selected.size === FORMATS.length ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div className="space-y-2">
            {FORMATS.map((fmt) => {
              const isSelected = selected.has(fmt.id);
              return (
                <button key={fmt.id} onClick={() => toggleFormat(fmt.id)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-all active:scale-[0.98]"
                  style={isSelected
                    ? { background: "rgba(212,160,32,0.08)", borderColor: "rgba(212,160,32,0.3)" }
                    : { background: "hsl(var(--background))", borderColor: "hsl(var(--border))" }}>
                  <div className="w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors"
                    style={{ borderColor: isSelected ? "rgba(212,160,32,0.6)" : "hsl(var(--border))", background: isSelected ? "rgba(212,160,32,0.15)" : "transparent" }}>
                    {isSelected && <Check size={12} style={{ color: "hsl(43,82%,60%)" }} />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-foreground">{fmt.label}</p>
                    <p className="text-xs text-muted-foreground">{fmt.desc} · {fmt.w}×{fmt.h}px</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fit options */}
        <div className={card + " space-y-3"}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Fit Mode</label>
          <div className="grid grid-cols-2 gap-2">
            {(["contain", "cover"] as const).map((mode) => (
              <button key={mode} onClick={() => setFitMode(mode)}
                className="flex flex-col items-center py-3 px-2 rounded-xl text-xs font-semibold border transition-all"
                style={fitMode === mode
                  ? { background: "rgba(212,160,32,0.15)", borderColor: "rgba(212,160,32,0.4)", color: "hsl(43,82%,60%)" }
                  : { borderColor: "hsl(var(--border))", background: "hsl(var(--background))", color: "hsl(var(--muted-foreground))" }}>
                <span className="font-bold capitalize">{mode}</span>
                <span className="text-[10px] font-normal mt-0.5 text-muted-foreground">
                  {mode === "contain" ? "Full image visible · adds bars" : "Fill frame · crops edges"}
                </span>
              </button>
            ))}
          </div>

          {fitMode === "contain" && (
            <div className="space-y-3 pt-1">
              <label className="text-xs font-semibold text-muted-foreground block">Background Style</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: "color",    label: "Solid Color" },
                  { id: "blur",     label: "Blur Image" },
                  { id: "dominant", label: "Auto Color" },
                ] as const).map((s) => (
                  <button key={s.id} onClick={() => setBgStyle(s.id)}
                    className="py-2.5 rounded-xl text-xs font-semibold border transition-all"
                    style={bgStyle === s.id
                      ? { background: "rgba(212,160,32,0.15)", borderColor: "rgba(212,160,32,0.4)", color: "hsl(43,82%,60%)" }
                      : { borderColor: "hsl(var(--border))", background: "hsl(var(--background))", color: "hsl(var(--muted-foreground))" }}>
                    {s.label}
                  </button>
                ))}
              </div>
              {bgStyle === "color" && (
                <div className="flex items-center gap-2">
                  <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-border cursor-pointer" />
                  <input type="text" value={bgColor} maxLength={7} onChange={(e) => setBgColor(e.target.value)}
                    className="flex-1 text-xs rounded-xl px-3 py-2 outline-none border border-border bg-background text-foreground font-mono" />
                  {["#111111","#ffffff","#1a1a2e"].map(c => (
                    <button key={c} onClick={() => setBgColor(c)} className="w-8 h-8 rounded-xl border-2 transition-all"
                      style={{ background: c, borderColor: bgColor === c ? "hsl(var(--primary))" : "transparent" }} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Premium Frames */}
        <div className={card + " space-y-3"}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-foreground">Custom Frame</span>
              <PremiumBadge className="ml-2" />
            </div>
            {frameUrl && isPremium && (
              <button onClick={() => { setFrameUrl(null); setFrameImg(null); }}
                className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
            )}
          </div>
          {isPremium ? (
            <div>
              {frameUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-border max-h-24">
                  <img src={frameUrl} alt="Frame" className="w-full h-24 object-contain" />
                </div>
              ) : (
                <button
                  onClick={() => frameRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-colors text-sm text-muted-foreground">
                  <ImageIcon size={16} />
                  Upload PNG frame (transparent)
                </button>
              )}
              {!frameUrl && (
                <button
                  onClick={() => frameRef.current?.click()}
                  className="mt-2 w-full text-xs text-center text-muted-foreground hover:text-primary">
                  Upload a transparent PNG frame overlay
                </button>
              )}
              <input ref={frameRef} type="file" accept="image/png,image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFrameUpload(f); e.target.value = ""; }} />
            </div>
          ) : (
            <PremiumLockedOverlay onUnlock={() => setLocation("/pre-unlock")}>
              <div className="rounded-2xl p-5 border border-dashed flex flex-col items-center gap-2 opacity-40" style={{ borderColor: "rgba(212,160,32,0.3)" }}>
                <Crown className="text-primary" />
                <p className="text-xs font-bold">⭐ Unlock Premium Overlay</p>
                <p className="text-[10px] text-muted-foreground text-center">Add your business frame to all flyers automatically.</p>
              </div>
            </PremiumLockedOverlay>
          )}
        </div>

        {/* Generate */}
        <button
          onClick={handleGenerate}
          disabled={!flyerImg || selected.size === 0 || generating}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all active:scale-[0.97] disabled:opacity-40 shadow-xl shadow-primary/20"
          style={{ background: "linear-gradient(135deg,hsl(43,82%,48%),hsl(43,90%,60%))", color: "hsl(218,50%,8%)" }}>
          {generating ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} className="fill-current" />}
          {generating ? "Generating..." : "Generate Previews"}
        </button>

        {/* Previews & Output */}
        {previews.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Generated Previews</h3>
              <button onClick={handleSaveAll} className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                <Download size={12} /> Save All To Device
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {previews.map((p) => (
                <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm group">
                  <div className="aspect-[4/5] bg-muted/20 relative">
                    <img src={p.url} className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                       <button 
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = p.url;
                          a.download = `flyer-${p.id}.jpg`;
                          a.click();
                        }}
                        className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center active:scale-90 transition-all"
                       >
                         <Download size={18} />
                       </button>
                    </div>
                  </div>
                  <div className="p-3 border-t border-border">
                    <p className="text-[10px] font-black uppercase tracking-widest truncate">{p.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 space-y-4">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-emerald-700">Ready to share!</p>
                    <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest">Select an option below</p>
                  </div>
               </div>
               <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={handleSaveAll}
                    className="w-full h-14 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-emerald-600/20"
                  >
                    <Download size={18} /> Save All To Device
                  </button>
                  <button 
                    onClick={() => setLocation("/invite")}
                    className="w-full h-12 bg-white/5 border border-emerald-500/30 text-emerald-600 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  >
                    <Users size={16} /> Invite Another Tailor
                  </button>
               </div>
            </div>
          </div>
        )}

        {flyerImg && selected.size === 0 && (
          <p className="text-xs text-center text-muted-foreground">Select at least one format above</p>
        )}
      </div>
    </div>
  );
}
