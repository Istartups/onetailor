import { useState, useRef, useEffect } from "react";
import { Upload, Download, X, Quote, Crown, Palette, Type, Image as ImageIcon, Sliders } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import ShareSheet from "@/components/shared/ShareSheet";
import { validateName } from "@/lib/utils";

const TEMPLATES = [
  { id: "square",    label: "Square",    w: 1080, h: 1080,  desc: "Instagram" },
  { id: "portrait",  label: "Portrait",  w: 1080, h: 1350,  desc: "FB / IG" },
  { id: "landscape", label: "Landscape", w: 1920, h: 1080,  desc: "Wide" },
  { id: "story",     label: "Story",     w: 1080, h: 1920,  desc: "Stories" },
];

const POSITIONS = [
  { id: "top-left",      label: "Top Left" },
  { id: "top-center",    label: "Top Center" },
  { id: "top-right",     label: "Top Right" },
  { id: "bottom-left",   label: "Bottom Left" },
  { id: "bottom-center", label: "Bottom Center" },
  { id: "bottom-right",  label: "Bottom Right" },
];

const LOGO_SIZES = [50, 75, 100, 125, 150, 200];

type BrandMode = "none" | "text" | "logo";
type Position = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

function getBrandCoords(pos: Position, W: number, H: number, pad: number): { x: number; y: number; align: CanvasTextAlign } {
  switch (pos) {
    case "top-left":      return { x: pad, y: pad * 2, align: "left" };
    case "top-center":    return { x: W / 2, y: pad * 2, align: "center" };
    case "top-right":     return { x: W - pad, y: pad * 2, align: "right" };
    case "bottom-left":   return { x: pad, y: H - pad, align: "left" };
    case "bottom-center": return { x: W / 2, y: H - pad, align: "center" };
    case "bottom-right":  return { x: W - pad, y: H - pad, align: "right" };
  }
}

export default function TestimonialCard() {
  const { toast } = useToast();
  const appLogo = useAppStore((s) => s.appLogo);
  const appName = useAppStore((s) => s.appName);
  const incrementUsage = useAppStore((s) => s.incrementUsage);

  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotImg, setScreenshotImg] = useState<HTMLImageElement | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [starCount, setStarCount] = useState(5);
  const [badgeText, setBadgeText] = useState("Verified Customer");
  const [template, setTemplate] = useState("square");
  const [accentColor, setAccentColor] = useState("#d4a020");
  const [cardBg1, setCardBg1] = useState("#0f172a");
  const [cardBg2, setCardBg2] = useState("#1e293b");
  const [textColor, setTextColor] = useState("#ffffff");
  const [brandMode, setBrandMode] = useState<BrandMode>("text");
  const [brandText, setBrandText] = useState(appName);
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(appLogo || "/onetailor-logo.png");
  const [logoSize, setLogoSize] = useState(100);
  const [brandPos, setBrandPos] = useState<Position>("bottom-right");
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [bgImageImg, setBgImageImg] = useState<HTMLImageElement | null>(null);
  const [fontSize, setFontSize] = useState(100);
  const [fontWeight, setFontWeight] = useState<"bold" | "600" | "500">("bold");
  const [generating, setGenerating] = useState(false);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const logoRef    = useRef<HTMLInputElement>(null);
  const bgRef      = useRef<HTMLInputElement>(null);

  // Sync with BrandKit if no manual changes yet
  useEffect(() => {
    if (brandLogoUrl === "/onetailor-logo.png" && appLogo) setBrandLogoUrl(appLogo);
    if (brandText === "OneTailor Tailors Toolkit" && appName !== "OneTailor Tailors Toolkit") setBrandText(appName);
  }, [appLogo, appName]);

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setScreenshotUrl(dataUrl);
      const img = new Image();
      img.onload = () => setScreenshotImg(img);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setBrandLogoUrl(e.target?.result as string);
      setBrandMode("logo");
    };
    reader.readAsDataURL(file);
  };

  const handleBgUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setBgImageUrl(dataUrl);
      const img = new Image();
      img.onload = () => setBgImageImg(img);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const renderCard = async () => {
    if (customerName) {
      const v = validateName(customerName);
      if (!v.valid) { toast({ title: "Invalid Name", description: v.message, variant: "destructive" }); return; }
    }
    if (brandMode === "text" && brandText) {
      const v = validateName(brandText);
      if (!v.valid) { toast({ title: "Invalid Brand Name", description: v.message, variant: "destructive" }); return; }
    }

    const canvas = canvasRef.current;
    if (!canvas || !screenshotImg) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tmpl = TEMPLATES.find((t) => t.id === template)!;
    const W = tmpl.w;
    const H = tmpl.h;
    canvas.width = W;
    canvas.height = H;

    const fScale = fontSize / 100;
    const pad = W * 0.07;

    // Background
    if (bgImageImg) {
      const bgAR = bgImageImg.naturalWidth / bgImageImg.naturalHeight;
      const canvasAR = W / H;
      let drawW, drawH, drawX, drawY;
      if (bgAR > canvasAR) {
        drawH = H;
        drawW = H * bgAR;
        drawX = (W - drawW) / 2;
        drawY = 0;
      } else {
        drawW = W;
        drawH = W / bgAR;
        drawX = 0;
        drawY = (H - drawH) / 2;
      }
      ctx.drawImage(bgImageImg, drawX, drawY, drawW, drawH);
      // Dark overlay for readability
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, W, H);
    } else {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, cardBg1);
      grad.addColorStop(1, cardBg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Accent circles
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = accentColor;
      ctx.beginPath(); ctx.arc(W, 0, W * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, H, W * 0.32, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    let y = pad;

    // Top accent line
    ctx.fillStyle = accentColor;
    ctx.fillRect(pad, y, W * 0.08, 4);
    y += 24;

    // Big quote mark
    ctx.font = `bold ${W * 0.12}px Georgia, serif`;
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.15;
    ctx.fillText("\u201C", pad - 4, y + W * 0.09);
    ctx.globalAlpha = 1;

    // Screenshot image
    const imgPad = pad;
    const imgW = W - imgPad * 2;
    const imgAR = screenshotImg.naturalHeight / screenshotImg.naturalWidth;
    const maxImgH = H * (template === "landscape" ? 0.55 : 0.42);
    const imgH = Math.min(imgAR * imgW, maxImgH);
    const imgY = y + W * 0.04;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = "rgba(0,0,0,0.01)";
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(imgPad, imgY, imgW, imgH, 18);
    else ctx.rect(imgPad, imgY, imgW, imgH);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(imgPad, imgY, imgW, imgH, 18);
    else ctx.rect(imgPad, imgY, imgW, imgH);
    ctx.clip();
    const srcAR = screenshotImg.naturalWidth / screenshotImg.naturalHeight;
    const drawH = imgH;
    const drawW = drawH * srcAR;
    const drawX = imgPad + (imgW - drawW) / 2;
    ctx.drawImage(screenshotImg, drawX, imgY, drawW, drawH);
    ctx.restore();

    ctx.strokeStyle = accentColor;
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(imgPad, imgY, imgW, imgH, 18);
    else ctx.rect(imgPad, imgY, imgW, imgH);
    ctx.stroke();
    ctx.globalAlpha = 1;

    y = imgY + imgH + pad * 0.8;

    // Customer name
    if (customerName) {
      ctx.font = `${fontWeight} ${W * 0.045 * fScale}px Inter, Arial, sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.fillText(customerName, pad, y);
      y += W * 0.05 * fScale;

      // Stars
      const starTxt = "★".repeat(starCount) + "☆".repeat(5 - starCount);
      ctx.font = `${W * 0.035 * fScale}px Arial`;
      ctx.fillStyle = accentColor;
      ctx.fillText(starTxt, pad, y);
      y += W * 0.045 * fScale;
    }

    // Divider
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(pad, y, W - pad * 2, 1);
    ctx.globalAlpha = 1;
    y += W * 0.04;

    // Badge text
    if (badgeText) {
      ctx.font = `${W * 0.028 * fScale}px Inter, Arial, sans-serif`;
      ctx.fillStyle = textColor;
      ctx.globalAlpha = 0.5;
      ctx.fillText(badgeText, pad, y);
      ctx.globalAlpha = 1;
    }

    // Brand watermark
    if (brandMode !== "none") {
      const bPos = getBrandCoords(brandPos, W, H, pad);
      ctx.textAlign = bPos.align;

      if (brandMode === "text" && brandText) {
        ctx.font = `bold ${W * 0.028 * fScale}px Inter, Arial, sans-serif`;
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = 0.75;
        ctx.fillText(brandText, bPos.x, bPos.y);
        ctx.globalAlpha = 1;
      } else if (brandMode === "logo" && brandLogoUrl) {
        try {
          const logo = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = brandLogoUrl;
          });
          const lScale = logoSize / 100;
          const lH = W * 0.055 * fScale * lScale;
          const lW = (logo.naturalWidth / logo.naturalHeight) * lH;
          let lx = bPos.x;
          if (bPos.align === "center") lx -= lW / 2;
          if (bPos.align === "right") lx -= lW;
          ctx.globalAlpha = 0.75;
          ctx.drawImage(logo, lx, bPos.y - lH, lW, lH);
          ctx.globalAlpha = 1;
        } catch { /* noop */ }
      }
      ctx.textAlign = "left";
    }
  };

  useEffect(() => {
    if (screenshotImg) renderCard();
  }, [
    screenshotImg, customerName, starCount, badgeText, template, accentColor,
    cardBg1, cardBg2, textColor, brandMode, brandText, brandLogoUrl, logoSize, brandPos,
    fontSize, fontWeight, bgImageImg
  ]);

  const generate = async () => {
    setGenerating(true);
    try {
      await renderCard();
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.toBlob(async (blob) => {
        if (blob) {
          setOutputBlob(blob);
          await incrementUsage();
        }
        setGenerating(false);
      }, "image/png");
    } catch (e) {
      setGenerating(false);
      toast({ title: "Failed to generate image", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    if (!outputBlob) return;
    const url = URL.createObjectURL(outputBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `testimonial_${customerName || "customer"}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inp = "w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-background text-foreground";

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <PageHeader 
        title="Testimonial Card" 
        subtitle="Turn feedback into marketing content" 
        backPath="/all-tools?cat=marketing"
        backLabel="Marketing Tools"
      />

      <div className="px-4 py-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Controls */}
        <div className="space-y-4">
          {/* Content Card */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Quote size={16} className="text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Feedback Details</h3>
            </div>

            {!screenshotUrl ? (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload size={20} className="text-primary" />
                </div>
                <p className="text-sm font-bold">Upload Screenshot</p>
                <p className="text-[10px] text-muted-foreground">Tap to select a chat screenshot</p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-border group">
                <img src={screenshotUrl} alt="Screenshot" className="w-full h-32 object-cover" />
                <button onClick={() => { setScreenshotUrl(null); setScreenshotImg(null); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm">
                  <X size={14} />
                </button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Customer Name</label>
                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Sandra Okoro" className={inp} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Rating (1-5)</label>
                <div className="flex items-center gap-1.5 h-10 px-2 rounded-xl border border-border bg-background">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setStarCount(s)} className={`text-lg transition-colors ${s <= starCount ? "text-primary" : "text-muted-foreground/30"}`}>★</button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Badge Text</label>
              <input type="text" value={badgeText} onChange={(e) => setBadgeText(e.target.value)} placeholder="e.g. Verified Customer" className={inp} />
            </div>
          </div>

          {/* Design Card */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Palette size={16} className="text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Design & Branding</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Template</label>
                <select value={template} onChange={(e) => setTemplate(e.target.value)} className={inp}>
                  {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label} ({t.desc})</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Accent Color</label>
                <div className="flex gap-2">
                  <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-10 h-10 rounded-xl border-0 p-0 overflow-hidden cursor-pointer" />
                  <input type="text" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className={`${inp} flex-1 font-mono uppercase`} maxLength={7} />
                </div>
              </div>
            </div>

            {/* Background Upload */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Custom Background</label>
              <div className="flex items-center gap-3">
                {!bgImageUrl ? (
                  <button onClick={() => bgRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border border-dashed border-primary/30 bg-primary/5 text-primary">
                    <ImageIcon size={14} /> Upload Background
                  </button>
                ) : (
                  <div className="flex-1 flex items-center gap-2">
                    <button onClick={() => bgRef.current?.click()} className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-border hover:bg-muted/30 transition-colors">
                      Replace
                    </button>
                    <button onClick={() => { setBgImageUrl(null); setBgImageImg(null); }} className="px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-100 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <input ref={bgRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBgUpload(f); e.target.value = ""; }} />
              </div>
            </div>

            {!bgImageUrl && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Bg Start</label>
                  <input type="color" value={cardBg1} onChange={(e) => setCardBg1(e.target.value)} className="w-full h-10 rounded-xl border-0 p-0 overflow-hidden cursor-pointer" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Bg End</label>
                  <input type="color" value={cardBg2} onChange={(e) => setCardBg2(e.target.value)} className="w-full h-10 rounded-xl border-0 p-0 overflow-hidden cursor-pointer" />
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2 border-t border-border/50">
              <label className="text-[10px] font-bold text-muted-foreground uppercase block">Watermark Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {(["none", "text", "logo"] as BrandMode[]).map((m) => (
                  <button key={m} onClick={() => setBrandMode(m)} className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${brandMode === m ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground"}`}>
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>

              {brandMode === "text" && (
                <input type="text" value={brandText} onChange={(e) => setBrandText(e.target.value)} placeholder="Brand Name" className={inp} />
              )}

              {brandMode === "logo" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-muted/30 border border-border flex items-center justify-center overflow-hidden shrink-0">
                      {brandLogoUrl ? <img src={brandLogoUrl} className="w-full h-full object-contain p-1" /> : <ImageIcon size={18} className="text-muted-foreground/30" />}
                    </div>
                    <button onClick={() => logoRef.current?.click()} className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-border bg-background hover:bg-muted/30 transition-colors">
                      {brandLogoUrl ? "Change Logo" : "Upload Logo"}
                    </button>
                  </div>
                  <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ""; }} />

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Logo Size</label>
                      <span className="text-[10px] font-bold text-primary">{logoSize}%</span>
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {LOGO_SIZES.map((s) => (
                        <button key={s} onClick={() => setLogoSize(s)} className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${logoSize === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                          {s}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {brandMode !== "none" && (
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Watermark Position</label>
                  <select value={brandPos} onChange={(e) => setBrandPos(e.target.value as Position)} className={inp}>
                    {POSITIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="space-y-4">
          <div className="sticky top-20 space-y-4">
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sliders size={16} className="text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preview</h3>
                </div>
                {generating && (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-primary" /> GENERATING...
                  </div>
                )}
              </div>

              <div className="relative bg-muted/20 rounded-xl overflow-hidden aspect-square flex items-center justify-center border border-border shadow-inner">
                {screenshotImg ? (
                  <canvas ref={canvasRef} className="max-w-full max-h-full object-contain shadow-2xl" style={{ width: "100%", height: "auto" }} />
                ) : (
                  <div className="text-center p-6 text-muted-foreground space-y-2">
                    <Quote size={32} className="mx-auto opacity-10" />
                    <p className="text-sm">Upload a screenshot to begin</p>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <button
                  onClick={generate}
                  disabled={!screenshotImg || generating}
                  className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Generate Final Card"}
                </button>

                {outputBlob && (
                  <ShareSheet
                    onDownload={handleDownload}
                    getFile={() => new File([outputBlob], `testimonial_${customerName || "customer"}.png`, { type: "image/png" })}
                    shareTitle="Testimonial Card"
                    shareText={`Check out this review from ${customerName || "a customer"}!`}
                  />
                )}
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
              <div className="flex gap-3">
                <Crown size={20} className="text-amber-500 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-500 uppercase tracking-wide">Marketing Premium Tip</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Testimonials are your best sales tool. Use the **Story** template for WhatsApp status and **Square** for Instagram posts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
