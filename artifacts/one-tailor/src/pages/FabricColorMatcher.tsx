import { useState, useRef, useCallback } from "react";
import { Palette, Upload, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAppStore } from "@/store/useAppStore";

interface ColorSuggestion {
  hex: string;
  name: string;
  role: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function hue(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  let h = 0;
  const d = max - min;
  if (max === r)      h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else                h = (r - g) / d + 4;
  return h * 60;
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  if (max === min) return 0;
  return (max - min) / (l > 0.5 ? 2 - max - min : max + min);
}

function suggestColors(r: number, g: number, b: number): ColorSuggestion[] {
  const h = hue(r, g, b);
  const s = saturation(r, g, b);
  const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

  const suggestions: ColorSuggestion[] = [];

  suggestions.push({ hex: rgbToHex(r, g, b), name: "Matching Tone", role: "Perfect match to fabric" });

  if (brightness > 0.5) {
    suggestions.push({ hex: "#1a1a1a", name: "Charcoal Black", role: "Strong contrast thread" });
    suggestions.push({ hex: "#2d3748", name: "Dark Navy", role: "Classic complementary" });
  } else {
    suggestions.push({ hex: "#f5f0e8", name: "Off White", role: "High contrast thread" });
    suggestions.push({ hex: "#e8d5b7", name: "Cream", role: "Soft contrast thread" });
  }

  if (s > 0.3) {
    const comp = (h + 180) % 360;
    if (comp < 30 || comp > 330) suggestions.push({ hex: "#c0392b", name: "Complementary Red", role: "Accent thread" });
    else if (comp < 90)          suggestions.push({ hex: "#f39c12", name: "Golden Yellow", role: "Accent thread" });
    else if (comp < 150)         suggestions.push({ hex: "#27ae60", name: "Forest Green", role: "Accent thread" });
    else if (comp < 210)         suggestions.push({ hex: "#2980b9", name: "Royal Blue", role: "Accent thread" });
    else if (comp < 270)         suggestions.push({ hex: "#8e44ad", name: "Deep Purple", role: "Accent thread" });
    else                         suggestions.push({ hex: "#c0392b", name: "Deep Red", role: "Accent thread" });
  }

  if (brightness > 0.3 && brightness < 0.7) {
    suggestions.push({ hex: "#c9a84c", name: "Gold Thread", role: "Decorative / embroidery" });
  }

  suggestions.push({ hex: "#6b7280", name: "Neutral Grey", role: "Safe all-purpose thread" });

  return suggestions.slice(0, 5);
}

function extractDominantColor(imageData: ImageData): [number, number, number] {
  const { data } = imageData;
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 16) {
    const a = data[i + 3];
    if (a > 128) { r += data[i]; g += data[i + 1]; b += data[i + 2]; count++; }
  }
  if (count === 0) return [128, 128, 128];
  return [r / count, g / count, b / count];
}

export default function FabricColorMatcher() {
  const addRecentTool = useAppStore((s) => s.addRecentTool);
  useState(() => { addRecentTool("color-matcher"); });

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [dominantColor, setDominantColor] = useState<[number, number, number] | null>(null);
  const [suggestions, setSuggestions] = useState<ColorSuggestion[] | null>(null);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const analyze = useCallback((file: File) => {
    setProcessing(true);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 100; canvas.height = 100;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setProcessing(false); return; }
      ctx.drawImage(img, 0, 0, 100, 100);
      const imageData = ctx.getImageData(0, 0, 100, 100);
      const [r, g, b] = extractDominantColor(imageData);
      setDominantColor([r, g, b]);
      setSuggestions(suggestColors(r, g, b));
      setProcessing(false);
    };
    img.onerror = () => setProcessing(false);
    img.src = url;
  }, []);

  const reset = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null); setDominantColor(null); setSuggestions(null);
  };

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader 
        title="Fabric Color Matcher" 
        subtitle="Find matching thread colors quickly" 
        backPath="/all-tools?cat=fabric"
        backLabel="Fabric Tools"
      />
      <div className="px-4 py-5 space-y-4">

        {!imageUrl ? (
          <div
            onClick={() => inputRef.current?.click()}
            className="rounded-2xl p-10 flex flex-col items-center gap-3 border-2 border-dashed cursor-pointer transition-all active:scale-[0.98]"
            style={{ borderColor: "rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.04)" }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(248,113,113,0.1)" }}>
              <Upload size={24} style={{ color: "hsl(0,80%,68%)" }} />
            </div>
            <div className="text-center">
              <p className="font-bold text-sm text-foreground">Upload Fabric Photo</p>
              <p className="text-xs text-muted-foreground mt-1">Take a clear photo of the fabric</p>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <img src={imageUrl} alt="Fabric" className="w-full h-48 object-cover" />
          </div>
        )}

        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) analyze(f); e.target.value = ""; }} />

        {processing && (
          <div className="text-center py-4">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2"
              style={{ borderColor: "hsl(0,80%,68%)", borderTopColor: "transparent" }} />
            <p className="text-sm text-muted-foreground">Analysing fabric colours…</p>
          </div>
        )}

        {dominantColor && suggestions && !processing && (
          <div className="space-y-3">
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dominant Fabric Colour</p>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl border border-border shrink-0"
                  style={{ background: rgbToHex(dominantColor[0], dominantColor[1], dominantColor[2]) }} />
                <div>
                  <p className="font-bold text-sm text-foreground">{rgbToHex(dominantColor[0], dominantColor[1], dominantColor[2]).toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">rgb({Math.round(dominantColor[0])}, {Math.round(dominantColor[1])}, {Math.round(dominantColor[2])})</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Suggested Thread Colours</p>
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                  <div className="w-10 h-10 rounded-xl border border-border shrink-0" style={{ background: s.hex }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.role}</p>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">{s.hex.toUpperCase()}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => inputRef.current?.click()}
                className="py-3 rounded-2xl font-semibold text-sm border border-border text-muted-foreground flex items-center justify-center gap-2 active:scale-95">
                <Upload size={15} /> New Photo
              </button>
              <button onClick={reset}
                className="py-3 rounded-2xl font-semibold text-sm border border-border text-muted-foreground flex items-center justify-center gap-2 active:scale-95">
                <RefreshCw size={15} /> Reset
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl px-4 py-3 bg-card border border-border">
          <p className="text-xs text-muted-foreground">💡 For best results, photograph the fabric in natural daylight and fill the frame with the fabric.</p>
        </div>
      </div>
    </div>
  );
}
