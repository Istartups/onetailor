import { useState, useCallback } from "react";
import { Plus, Trash2, Save, FileText, Crown, ChevronDown, ChevronUp, Layers, Calculator, Info } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { PremiumLockedOverlay } from "@/components/shared/PremiumBadge";
import { useAppStore } from "@/store/useAppStore";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { FabricItem, NotionItem, FabricQuote } from "@/store/useAppStore";
import { validateName } from "@/lib/utils";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function calcTotals(
  fabrics: FabricItem[],
  notions: NotionItem[],
  laborHours: number,
  hourlyRate: number,
  overheadPercent: number
) {
  const fabricCost = fabrics.reduce((s, f) => s + f.pricePerUnit * f.quantity, 0);
  const notionCost = notions.reduce((s, n) => s + n.cost, 0);
  const laborCost = laborHours * hourlyRate;
  const subTotal = fabricCost + notionCost + laborCost;
  const overhead = (subTotal * overheadPercent) / 100;
  const total = subTotal + overhead;
  return { fabricCost, notionCost, laborCost, overhead, total };
}

export default function FabricCost() {
  const isPremium = useAppStore((s) => s.isPremium);
  const currencySymbol = useAppStore((s) => s.currencySymbol);
  const addFabricQuote = useAppStore((s) => s.addFabricQuote);
  const fabricQuotes = useAppStore((s) => s.fabricQuotes);
  const deleteFabricQuote = useAppStore((s) => s.deleteFabricQuote);
  const incrementUsage = useAppStore((s) => s.incrementUsage);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [fabrics, setFabrics] = useState<FabricItem[]>([
    { id: uid(), name: "Main Fabric", pricePerUnit: 0, quantity: 1, unit: "meter" },
  ]);
  const [notions, setNotions] = useState<NotionItem[]>([]);
  const [laborHours, setLaborHours] = useState(3);
  const [hourlyRate, setHourlyRate] = useState(2000);
  const [overheadPercent, setOverheadPercent] = useState(10);
  const [clientName, setClientName] = useState("");
  const [garmentType, setGarmentType] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const { fabricCost, notionCost, laborCost, overhead, total } = calcTotals(
    fabrics, notions, laborHours, hourlyRate, overheadPercent
  );

  const addFabric = () => setFabrics((f) => [...f, { id: uid(), name: "", pricePerUnit: 0, quantity: 1, unit: "meter" }]);
  const updateFabric = (id: string, field: keyof FabricItem, value: string | number) =>
    setFabrics((f) => f.map((item) => item.id === id ? { ...item, [field]: value } : item));
  const removeFabric = (id: string) => setFabrics((f) => f.filter((item) => item.id !== id));

  const addNotion = () => setNotions((n) => [...n, { id: uid(), name: "", cost: 0 }]);
  const updateNotion = (id: string, field: keyof NotionItem, value: string | number) =>
    setNotions((n) => n.map((item) => item.id === id ? { ...item, [field]: value } : item));
  const removeNotion = (id: string) => setNotions((n) => n.filter((item) => item.id !== id));

  const saveQuote = useCallback(async () => {
    if (total === 0) { toast({ title: "Add some costs first!", variant: "destructive" }); return; }

    if (clientName) {
      const v = validateName(clientName);
      if (!v.valid) { toast({ title: "Invalid Client Name", description: v.message, variant: "destructive" }); return; }
    }
    if (garmentType) {
      const v = validateName(garmentType);
      if (!v.valid) { toast({ title: "Invalid Garment Type", description: v.message, variant: "destructive" }); return; }
    }
    for (const f of fabrics) {
      if (f.name) {
        const v = validateName(f.name);
        if (!v.valid) { toast({ title: `Invalid Fabric Name: ${f.name}`, description: v.message, variant: "destructive" }); return; }
      }
    }
    for (const n of notions) {
      if (n.name) {
        const v = validateName(n.name);
        if (!v.valid) { toast({ title: `Invalid Notion Name: ${n.name}`, description: v.message, variant: "destructive" }); return; }
      }
    }

    const quote: FabricQuote = {
      id: uid(),
      clientName: clientName || "Unnamed",
      garmentType: garmentType || "Garment",
      fabrics,
      notions,
      laborHours,
      hourlyRate,
      overheadPercent,
      totalCost: total,
      suggestedPrice: total * 1.3,
      date: new Date().toISOString(),
    };
    addFabricQuote(quote);
    await incrementUsage();
    toast({ title: "Quote saved!", description: `${quote.clientName} — ${currencySymbol}${total.toLocaleString()}` });
    setClientName("");
    setGarmentType("");
    setFabrics([{ id: uid(), name: "Main Fabric", pricePerUnit: 0, quantity: 1, unit: "meter" }]);
    setNotions([]);
    setLaborHours(3);
    setHourlyRate(2000);
    setOverheadPercent(10);
  }, [total, clientName, garmentType, fabrics, notions, laborHours, hourlyRate, overheadPercent, addFabricQuote, toast, incrementUsage]);

  const inputStyle = "w-full rounded-xl px-3 py-2.5 text-sm outline-none border border-border bg-background text-foreground focus:border-primary/50 transition-colors";

  const content = (
    <div className="px-4 py-5 space-y-4">
      {/* Client info */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Layers size={16} className="text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Client & Garment</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Client Name</label>
            <input
              type="text" placeholder="e.g. Mrs. Amaka"
              value={clientName} onChange={(e) => setClientName(e.target.value)}
              className={inputStyle}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Garment Type</label>
            <input
              type="text" placeholder="e.g. Ankara Dress"
              value={garmentType} onChange={(e) => setGarmentType(e.target.value)}
              className={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Fabric items */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fabric & Materials</h3>
          </div>
          <button onClick={addFabric} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <Plus size={14} /> Add Fabric
          </button>
        </div>
        <div className="space-y-3">
          {fabrics.map((item) => (
            <div key={item.id} className="space-y-2 pb-3 border-b border-border/50 last:border-0 last:pb-0">
              <div className="flex gap-2">
                <input type="text" placeholder="Fabric name" value={item.name}
                  onChange={(e) => updateFabric(item.id, "name", e.target.value)}
                  className={`${inputStyle} flex-1`} />
                <button onClick={() => removeFabric(item.id)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-colors shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">{currencySymbol}</span>
                  <input type="number" placeholder="Price" value={item.pricePerUnit || ""}
                    onChange={(e) => updateFabric(item.id, "pricePerUnit", parseFloat(e.target.value) || 0)}
                    className={`${inputStyle} pl-7`} />
                </div>
                <input type="number" placeholder="Qty" value={item.quantity || ""}
                  onChange={(e) => updateFabric(item.id, "quantity", parseFloat(e.target.value) || 0)}
                  className={`${inputStyle} w-20`} />
                <select value={item.unit} onChange={(e) => updateFabric(item.id, "unit", e.target.value)}
                  className="rounded-xl px-2 py-2 text-xs outline-none border border-border bg-background text-foreground w-20">
                  <option>meter</option><option>yard</option><option>piece</option>
                </select>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs pt-2 font-bold">
          <span className="text-muted-foreground">Fabric subtotal</span>
          <span className="text-primary">{currencySymbol}{fabricCost.toLocaleString()}</span>
        </div>
      </div>

      {/* Notions */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notions & Trims</h3>
          </div>
          <button onClick={addNotion} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <Plus size={14} /> Add Notion
          </button>
        </div>
        {notions.length === 0 && (
          <p className="text-[11px] text-muted-foreground italic">Buttons, zippers, lining, thread, etc.</p>
        )}
        <div className="space-y-3">
          {notions.map((item) => (
            <div key={item.id} className="flex gap-2">
              <input type="text" placeholder="e.g. Zip, Buttons" value={item.name}
                onChange={(e) => updateNotion(item.id, "name", e.target.value)}
                className={`${inputStyle} flex-1`} />
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">{currencySymbol}</span>
                <input type="number" placeholder="Cost" value={item.cost || ""}
                  onChange={(e) => updateNotion(item.id, "cost", parseFloat(e.target.value) || 0)}
                  className={`${inputStyle} pl-7`} />
              </div>
              <button onClick={() => removeNotion(item.id)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-colors shrink-0">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        {notions.length > 0 && (
          <div className="flex items-center justify-between text-xs pt-2 font-bold">
            <span className="text-muted-foreground">Notions subtotal</span>
            <span className="text-primary">{currencySymbol}{notionCost.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Labor & Overhead */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Calculator size={16} className="text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Labor & Overhead</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Labor Hours</label>
            <input type="number" placeholder="3"
              value={laborHours || ""} onChange={(e) => setLaborHours(parseFloat(e.target.value) || 0)}
              className={inputStyle} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Rate ({currencySymbol}/hour)</label>
            <input type="number" placeholder="2000"
              value={hourlyRate || ""} onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
              className={inputStyle} />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Overhead Markup</label>
            <span className="text-xs font-bold text-primary">{overheadPercent}%</span>
          </div>
          <input type="range" min={0} max={50} value={overheadPercent}
            onChange={(e) => setOverheadPercent(Number(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
        </div>
        <div className="flex flex-col gap-1 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Labor Cost</span>
            <span className="font-bold text-foreground">{currencySymbol}{laborCost.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Overhead ({overheadPercent}%)</span>
            <span className="font-bold text-foreground">{currencySymbol}{overhead.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-6 space-y-4 shadow-lg shadow-primary/20">
        <div className="text-center space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Total Production Cost</p>
          <p className="text-4xl font-black">
            {currencySymbol}{Math.round(total).toLocaleString()}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <p className="text-[9px] font-bold uppercase opacity-80">Suggested Price</p>
            <p className="text-lg font-bold">{currencySymbol}{(total * 1.3).toLocaleString()}</p>
            <p className="text-[8px] opacity-70">30% Profit Margin</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <p className="text-[9px] font-bold uppercase opacity-80">Premium Price</p>
            <p className="text-lg font-bold">{currencySymbol}{(total * 1.6).toLocaleString()}</p>
            <p className="text-[8px] opacity-70">60% Profit Margin</p>
          </div>
        </div>

        <button onClick={saveQuote} className="w-full py-3.5 bg-white text-primary font-black rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm">
          <Save size={18} />
          Save This Quote
        </button>
      </div>

      {/* History Toggle */}
      <button onClick={() => setShowHistory(!showHistory)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card border border-border rounded-2xl text-sm font-bold text-muted-foreground hover:text-foreground transition-colors shadow-sm">
        <div className="flex items-center gap-2">
          <FileText size={18} />
          Saved Quotes ({fabricQuotes.length})
        </div>
        {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {showHistory && (
        <div className="space-y-3">
          {fabricQuotes.length === 0 ? (
            <div className="text-center py-10 bg-muted/20 rounded-2xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground">No saved quotes yet</p>
            </div>
          ) : (
            fabricQuotes.map((q) => (
              <div key={q.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm relative overflow-hidden group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-foreground">{q.clientName}</h4>
                    <p className="text-xs text-muted-foreground">{q.garmentType} • {new Date(q.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-primary">{currencySymbol}{q.totalCost.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Total Cost</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => deleteFabricQuote(q.id)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-500 text-xs font-bold hover:bg-red-100 transition-colors">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-lg mx-auto relative min-h-screen pb-10">
      <PageHeader 
        title="Fabric Cost Estimator" 
        subtitle="Quote materials fast and accurately" 
        backPath="/all-tools?cat=pricing"
        backLabel="Tailoring Tools"
      />
      {content}
    </div>
  );
}
