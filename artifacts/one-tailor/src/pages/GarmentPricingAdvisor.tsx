import { useState } from "react";
import { Tag, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAppStore } from "@/store/useAppStore";

type Complexity = "simple" | "standard" | "premium" | "luxury";

const COMPLEXITY_MULTIPLIER: Record<Complexity, { min: number; rec: number; prem: number }> = {
  simple:   { min: 1.10, rec: 1.30, prem: 1.55 },
  standard: { min: 1.15, rec: 1.40, prem: 1.70 },
  premium:  { min: 1.20, rec: 1.55, prem: 1.90 },
  luxury:   { min: 1.30, rec: 1.70, prem: 2.20 },
};

const COMPLEXITY_LABELS: Record<Complexity, { label: string; desc: string }> = {
  simple:   { label: "Simple",   desc: "Basic stitching, no embroidery" },
  standard: { label: "Standard", desc: "Regular tailoring work" },
  premium:  { label: "Premium",  desc: "Intricate details, embroidery" },
  luxury:   { label: "Luxury",   desc: "High-end, bespoke craftsmanship" },
};

export default function GarmentPricingAdvisor() {
  const addRecentTool = useAppStore((s) => s.addRecentTool);
  const currencySymbol = useAppStore((s) => s.currencySymbol);
  const incrementUsage = useAppStore((s) => s.incrementUsage);
  useState(() => { addRecentTool("pricing-advisor"); });

  const formatPrice = (n: number) => {
    return currencySymbol + Math.round(n).toLocaleString("en-NG");
  };

  const [fabricCost, setFabricCost] = useState("");
  const [accessoriesCost, setAccessoriesCost] = useState("");
  const [laborHours, setLaborHours] = useState("");
  const [hourlyRate, setHourlyRate] = useState("2000");
  const [complexity, setComplexity] = useState<Complexity>("standard");
  const [result, setResult] = useState<{ totalCost: number; min: number; rec: number; prem: number } | null>(null);

  const calculate = async () => {
    const fabric = parseFloat(fabricCost) || 0;
    const acc    = parseFloat(accessoriesCost) || 0;
    const hours  = parseFloat(laborHours) || 0;
    const rate   = parseFloat(hourlyRate) || 0;
    const totalCost = fabric + acc + hours * rate;
    if (totalCost <= 0) return;
    const mults = COMPLEXITY_MULTIPLIER[complexity];
    setResult({
      totalCost,
      min:  totalCost * mults.min,
      rec:  totalCost * mults.rec,
      prem: totalCost * mults.prem,
    });
    await incrementUsage();
  };

  const inp = "w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-background text-foreground";

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader 
        title="Price Smartly" 
        subtitle="Price your work with confidence" 
        backPath="/all-tools?cat=pricing"
        backLabel="Business Tools"
      />
      <div className="px-4 py-5 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Fabric Cost ({currencySymbol})</label>
              <input type="number" min={0} placeholder="e.g. 8000" value={fabricCost}
                onChange={(e) => { setFabricCost(e.target.value); setResult(null); }} className={inp} />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Accessories Cost ({currencySymbol})</label>
              <input type="number" min={0} placeholder="e.g. 1500" value={accessoriesCost}
                onChange={(e) => { setAccessoriesCost(e.target.value); setResult(null); }} className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Labor Hours</label>
              <input type="number" min={0} step={0.5} placeholder="e.g. 6" value={laborHours}
                onChange={(e) => { setLaborHours(e.target.value); setResult(null); }} className={inp} />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Hourly Rate ({currencySymbol})</label>
              <input type="number" min={0} placeholder="2000" value={hourlyRate}
                onChange={(e) => { setHourlyRate(e.target.value); setResult(null); }} className={inp} />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-2">Work Complexity</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(COMPLEXITY_LABELS) as [Complexity, { label: string; desc: string }][]).map(([c, { label, desc }]) => (
                <button key={c} onClick={() => { setComplexity(c); setResult(null); }}
                  className={`text-left p-3 rounded-xl border transition-all active:scale-95 ${complexity === c ? "" : "border-border bg-transparent"}`}
                  style={complexity === c ? { background: "rgba(212,160,32,0.1)", borderColor: "rgba(212,160,32,0.4)" } : undefined}>
                  <p className="text-xs font-bold" style={{ color: complexity === c ? "hsl(43,82%,60%)" : "hsl(43,25%,70%)" }}>{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {!result ? (
          <button onClick={calculate} disabled={!fabricCost && !laborHours}
            className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50">
            Calculate Quote
          </button>
        ) : (
          <div className="bg-slate-900 rounded-2xl p-5 border border-primary/20 space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Base Production Cost</span>
              <span className="text-xl font-black text-white">{formatPrice(result.totalCost)}</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 group hover:border-emerald-500/30 transition-all">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-black uppercase text-emerald-400">Minimum Price</span>
                  <span className="text-sm font-bold text-white">{formatPrice(result.min)}</span>
                </div>
                <p className="text-[9px] text-slate-400">Recommended for quick turnaround or simple repairs.</p>
              </div>

              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 ring-1 ring-primary/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 bg-primary text-[8px] font-black px-2 py-0.5 rounded-bl-lg uppercase text-primary-foreground">Recommended</div>
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-black uppercase text-primary">Standard Price</span>
                  <span className="text-lg font-black text-white">{formatPrice(result.rec)}</span>
                </div>
                <p className="text-[9px] text-slate-300">Best balance for quality work and business growth.</p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5 group hover:border-amber-500/30 transition-all">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-black uppercase text-amber-400">Premium/Luxury Price</span>
                  <span className="text-sm font-bold text-white">{formatPrice(result.prem)}</span>
                </div>
                <p className="text-[9px] text-slate-400">For high-end bespoke work with complex detailing.</p>
              </div>
            </div>

            <button onClick={() => setResult(null)} className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground py-2 hover:text-foreground transition-colors">
              <RefreshCw size={14} />
              Reset Calculator
            </button>
          </div>
        )}

        <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3.5">
          <p className="text-[10px] text-amber-500/80 uppercase font-bold mb-1.5">💡 Pricing Tip</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            These estimates are based on industry standard margins. Adjust based on your local market competition and your brand reputation.
          </p>
        </div>
      </div>
    </div>
  );
}
