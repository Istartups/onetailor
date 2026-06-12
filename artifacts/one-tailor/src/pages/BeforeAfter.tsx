import { useState, useRef, useEffect } from "react";
import { Upload, X, ArrowLeftRight, ArrowUpDown, Crown, Edit2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import ShareSheet from "@/components/shared/ShareSheet";

type Layout = "side-by-side" | "top-bottom" | "diagonal" | "triptych";

const FREE_LAYOUTS: Layout[] = ["side-by-side", "top-bottom"];
const LAYOUTS = [
  { id: "side-by-side" as Layout, label: "Side by Side", icon: ArrowLeftRight, premium: false },
  { id: "top-bottom"   as Layout, label: "Top / Bottom", icon: ArrowUpDown,    premium: false },
  { id: "diagonal"     as Layout, label: "Diagonal",     icon: ArrowLeftRight, premium: true  },
  { id: "triptych"     as Layout, label: "3-Panel",      icon: ArrowLeftRight, premium: true  },
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function BeforeAfter() {
  const { toast } = useToast();
  const isPremium = useAppStore((s) => s.isPremium);
  const incrementUsage = useAppStore((s) => s.incrementUsage);
  const [, setLocation] = useLocation();
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout>("side-by-side");
  const [showLabels, setShowLabels] = useState(true);
  const [labelColor, setLabelColor] = useState<"white" | "black" | "gold">("white");
  const [beforeLabel, setBeforeLabel] = useState("BEFORE");
  const [afterLabel, setAfterLabel]   = useState("AFTER");
  const [editingLabels, setEditingLabels] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);

  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef  = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const readFile = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });

  const renderCanvas = async (bUrl: string | null, aUrl: string | null, lyt: Layout, labels: boolean, color: string) => {
    const canvas = canvasRef.current;
    if (!canvas || !bUrl || !aUrl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const [before, after] = await Promise.all([loadImage(bUrl), loadImage(aUrl)]);
    const divider = 6;
    const W = 900;

    const scaleH = (img: HTMLImageElement, w: number) => Math.round((img.naturalHeight / img.naturalWidth) * w);

    let cw: number, ch: number;
    if (lyt === "side-by-side" || lyt === "diagonal") {
      const half = Math.floor(W / 2);
      const maxH = Math.max(scaleH(before, half), scaleH(after, half));
      cw = W; ch = maxH;
    } else if (lyt === "top-bottom") {
      cw = W;
      ch = scaleH(before, W) + scaleH(after, W) + divider;
    } else {
      // triptych: before full left, after top-right + bottom-right
      const leftW = Math.floor(W * 0.6);
      const rightW = W - leftW - divider;
      cw = W; ch = scaleH(before, leftW);
    }

    canvas.width = cw;
    canvas.height = ch;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, cw, ch);

    if (lyt === "side-by-side") {
      const half = Math.floor(cw / 2);
      ctx.drawImage(before, 0, 0, half, ch);
      ctx.fillStyle = "#000";
      ctx.fillRect(half, 0, divider, ch);
      ctx.drawImage(after, half + divider, 0, half - divider, ch);
    } else if (lyt === "top-bottom") {
      const bH = scaleH(before, cw);
      const aH = scaleH(after, cw);
      ctx.drawImage(before, 0, 0, cw, bH);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, bH, cw, divider);
      ctx.drawImage(after, 0, bH + divider, cw, aH);
    } else if (lyt === "diagonal") {
      const half = Math.floor(cw / 2);
      ctx.drawImage(before, 0, 0, cw, ch);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(half + 30, 0); ctx.lineTo(cw, 0); ctx.lineTo(cw, ch); ctx.lineTo(half - 30, ch);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(after, 0, 0, cw, ch);
      ctx.restore();
      // Diagonal divider
      ctx.save();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = divider;
      ctx.beginPath();
      ctx.moveTo(half + 30, 0); ctx.lineTo(half - 30, ch);
      ctx.stroke();
      ctx.restore();
    } else {
      // triptych
      const leftW = Math.floor(cw * 0.6);
      const rightW = cw - leftW - divider;
      ctx.drawImage(before, 0, 0, leftW, ch);
      ctx.fillStyle = "#000";
      ctx.fillRect(leftW, 0, divider, ch);
      const halfH = Math.floor(ch / 2);
      ctx.drawImage(after, leftW + divider, 0, rightW, halfH - divider / 2);
      ctx.fillStyle = "#000";
      ctx.fillRect(leftW + divider, halfH - divider / 2, rightW, divider);
      ctx.drawImage(after, leftW + divider, halfH + divider / 2, rightW, halfH - divider / 2);
    }

    if (labels) {
      const textColor = color === "gold" ? "#d4a020" : color === "black" ? "#000000" : "#ffffff";
      const bgColor = color === "white" ? "rgba(0,0,0,0.6)" : color === "black" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
      const fontSize = Math.round(cw * 0.025);
      ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;

      const drawLabel = (text: string, x: number, y: number) => {
        const metrics = ctx.measureText(text);
        const pad = fontSize * 0.5;
        const bW = metrics.width + pad * 2;
        const bH = fontSize + pad * 1.2;
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, bW, bH, 6);
        else ctx.rect(x, y, bW, bH);
        ctx.fill();
        ctx.fillStyle = textColor;
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        ctx.fillText(text, x + pad, y + bH * 0.72);
        ctx.shadowBlur = 0;
      };

      const pad = fontSize;
      if (lyt === "side-by-side") {
        drawLabel(beforeLabel, pad, pad);
        drawLabel(afterLabel, cw / 2 + divider + pad, pad);
      } else if (lyt === "top-bottom") {
        const bH = scaleH(before, cw);
        drawLabel(beforeLabel, pad, pad);
        drawLabel(afterLabel, pad, bH + divider + pad);
      } else if (lyt === "diagonal") {
        drawLabel(beforeLabel, pad, pad);
        drawLabel(afterLabel, cw - pad - ctx.measureText(afterLabel).width - fontSize, pad);
      } else {
        const leftW = Math.floor(cw * 0.6);
        drawLabel(beforeLabel, pad, pad);
        drawLabel(afterLabel, leftW + divider + pad, pad);
      }
    }
  };

  useEffect(() => {
    if (beforeUrl && afterUrl) {
      renderCanvas(beforeUrl, afterUrl, layout, showLabels, labelColor).then(() => {
        canvasRef.current?.toBlob((b) => b && setOutputBlob(b), "image/jpeg", 0.93);
      });
    }
  }, [beforeUrl, afterUrl, layout, showLabels, labelColor, beforeLabel, afterLabel]);

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setGenerating(true);
    try {
      await renderCanvas(beforeUrl, afterUrl, layout, showLabels, labelColor);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/jpeg", 0.93);
      a.download = "before-after.jpg";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      toast({ title: "Downloaded!", description: "Before & After collage saved." });
      canvas.toBlob((b) => b && setOutputBlob(b), "image/jpeg", 0.93);
      await incrementUsage();
    } finally {
      setGenerating(false);
    }
  };

  const card = "bg-card border border-border rounded-2xl p-4";
  const inp  = "w-full text-sm rounded-xl px-3 py-2 outline-none border border-border bg-background text-foreground";
  const hasImages = beforeUrl && afterUrl;

  return (
    <div className="max-w-xl mx-auto pb-10">
      <PageHeader 
        title="Before & After" 
        subtitle="Showcase your work professionally" 
        backPath="/all-tools?cat=marketing"
        backLabel="Marketing Tools"
      />
      <div className="px-4 py-5 space-y-4">

        {/* Upload pair */}
        <div className="grid grid-cols-2 gap-3">
          {(["before", "after"] as const).map((side) => {
            const url   = side === "before" ? beforeUrl : afterUrl;
            const ref   = side === "before" ? beforeRef : afterRef;
            const label = side === "before" ? beforeLabel : afterLabel;
            return (
              <div key={side}>
                <label className="text-[11px] font-bold uppercase tracking-widest block mb-1.5 px-0.5 text-muted-foreground">
                  {label || (side === "before" ? "Before" : "After")}
                </label>
                <div
                  onClick={() => ref.current?.click()}
                  className="rounded-2xl overflow-hidden border-2 border-dashed cursor-pointer transition-all active:scale-[0.98] aspect-square flex flex-col items-center justify-center"
                  style={{ borderColor: url ? (side === "before" ? "rgba(96,165,250,0.4)" : "rgba(74,222,128,0.4)") : "hsl(var(--border))" }}>
                  {url ? (
                    <div className="relative w-full h-full">
                      <img src={url} alt={side} className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => { e.stopPropagation(); side === "before" ? setBeforeUrl(null) : setAfterUrl(null); }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center bg-black/60">
                        <X size={12} className="text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4">
                      <Upload size={22} className="text-muted-foreground/50" />
                      <span className="text-xs text-muted-foreground text-center">Upload {side} photo</span>
                    </div>
                  )}
                </div>
                <input ref={ref} type="file" accept="image/*" className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const url = await readFile(f);
                    side === "before" ? setBeforeUrl(url) : setAfterUrl(url);
                    e.target.value = "";
                  }} />
              </div>
            );
          })}
        </div>

        {/* Label editing */}
        <div className={card}>
          <button
            onClick={() => setEditingLabels(!editingLabels)}
            className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
            <Edit2 size={14} className="text-muted-foreground" />
            Custom Labels
          </button>
          {editingLabels && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Left / Top label</label>
                <input className={inp} value={beforeLabel} onChange={(e) => setBeforeLabel(e.target.value.toUpperCase())} placeholder="BEFORE" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Right / Bottom label</label>
                <input className={inp} value={afterLabel} onChange={(e) => setAfterLabel(e.target.value.toUpperCase())} placeholder="AFTER" />
              </div>
            </div>
          )}
        </div>

        {/* Layout options */}
        <div className={card + " space-y-3"}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Layout</label>
          <div className="grid grid-cols-2 gap-2">
            {LAYOUTS.map((lyt) => {
              const locked = lyt.premium && !isPremium;
              const active = layout === lyt.id;
              return (
                <button
                  key={lyt.id}
                  onClick={() => {
                    if (locked) {
                      setLocation("/pre-unlock");
                    } else {
                      setLayout(lyt.id);
                    }
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all relative ${
                    active ? "bg-primary/10 border-primary shadow-sm" : "bg-card border-border hover:border-primary/30"
                  }`}
                >
                  <lyt.icon className={`w-5 h-5 mb-1.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-[10px] font-bold ${active ? "text-primary" : "text-muted-foreground"}`}>{lyt.label}</span>
                  {lyt.premium && (
                    <div className="absolute top-1 right-1">
                      <Crown size={10} className={locked ? "text-amber-500" : "text-primary/40"} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Label options */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">Show labels</span>
            <button
              onClick={() => setShowLabels(!showLabels)}
              className="w-10 h-5 rounded-full relative transition-colors"
              style={{ background: showLabels ? "hsl(43,82%,50%)" : "hsl(var(--muted))" }}>
              <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                style={{ transform: showLabels ? "translateX(20px)" : "translateX(0)" }} />
            </button>
          </div>

          {showLabels && (
            <div className="flex gap-2">
              {(["white", "black", "gold"] as const).map((c) => (
                <button key={c} onClick={() => setLabelColor(c)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold border capitalize transition-all"
                  style={labelColor === c
                    ? { background: "rgba(212,160,32,0.15)", borderColor: "rgba(212,160,32,0.4)", color: "hsl(43,82%,60%)" }
                    : { borderColor: "hsl(var(--border))", background: "hsl(var(--background))", color: "hsl(var(--muted-foreground))" }}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Canvas preview */}
        {hasImages && (
          <div className="rounded-2xl overflow-hidden border border-border">
            <canvas ref={canvasRef} className="w-full h-auto" />
          </div>
        )}

        {/* Download / Share */}
        {hasImages && (
          <ShareSheet
            onDownload={handleDownload}
            getFile={() => outputBlob ? new File([outputBlob], "before-after.jpg", { type: "image/jpeg" }) : null}
            filename="before-after.jpg"
            shareTitle="Before & After Comparison"
          />
        )}
        {!hasImages && (
          <button disabled className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm opacity-40"
            style={{ background: "linear-gradient(135deg,hsl(43,82%,48%),hsl(43,90%,60%))", color: "hsl(218,50%,8%)" }}>
            {generating ? "Generating..." : "Upload both photos to continue"}
          </button>
        )}
      </div>
    </div>
  );
}
