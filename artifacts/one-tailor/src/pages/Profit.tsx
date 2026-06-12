import { useState, useCallback } from "react";
import { History, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { PremiumBadge, PremiumLockedOverlay } from "@/components/shared/PremiumBadge";
import { useAppStore } from "@/store/useAppStore";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const PRESETS = [10, 20, 30, 50];

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export default function Profit() {
  const [cost, setCost] = useState("");
  const [profitPct, setProfitPct] = useState<number | null>(null);
  const [customPct, setCustomPct] = useState("");
  const isPremium = useAppStore((s) => s.isPremium);
  const currencySymbol = useAppStore((s) => s.currencySymbol);
  const calculationHistory = useAppStore((s) => s.calculationHistory);
  const addCalculationHistory = useAppStore((s) => s.addCalculationHistory);
  const incrementUsage = useAppStore((s) => s.incrementUsage);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const activePct = profitPct ?? (customPct ? parseFloat(customPct) : null);
  const costNum = parseFloat(cost) || 0;
  const profitAmount = activePct !== null ? (costNum * activePct) / 100 : null;
  const sellingPrice = profitAmount !== null ? costNum + profitAmount : null;

  const handleSave = useCallback(async () => {
    if (sellingPrice === null || !cost || activePct === null) return;
    addCalculationHistory({
      cost: costNum,
      profit: activePct,
      selling: sellingPrice,
      date: new Date().toISOString(),
    });
    await incrementUsage();
    toast({ title: "Saved!", description: "Calculation added to history." });
  }, [sellingPrice, cost, costNum, activePct, addCalculationHistory, toast, incrementUsage]);

  const handleReset = () => {
    setCost("");
    setProfitPct(null);
    setCustomPct("");
  };

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title="Profit Calculator"
        subtitle="Avoid underpricing your work"
        backPath="/all-tools?cat=pricing"
        backLabel="Business Tools"
        rightElement={
          <button onClick={handleReset} className="p-2 rounded-full hover:bg-muted transition-colors" data-testid="button-reset">
            <RotateCcw size={18} className="text-muted-foreground" />
          </button>
        }
      />

      <div className="px-4 py-5 space-y-4">
        {/* Cost input */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Cost Price</label>
          <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-3 border border-border focus-within:ring-2 focus-within:ring-primary">
            <span className="text-xl font-bold text-muted-foreground">{currencySymbol}</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="flex-1 bg-transparent text-2xl font-bold text-foreground outline-none"
              data-testid="input-cost"
            />
          </div>
        </div>

        {/* Profit % presets */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Profit Margin</label>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((pct) => (
              <button
                key={pct}
                onClick={() => { setProfitPct(pct); setCustomPct(""); }}
                className={`py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                  profitPct === pct
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted/50 text-foreground border border-border hover:bg-muted"
                }`}
                data-testid={`button-pct-${pct}`}
              >
                {pct}%
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">Custom:</span>
            <div className="flex-1 flex items-center gap-1 bg-muted/50 rounded-xl px-3 py-2 border border-border focus-within:ring-2 focus-within:ring-primary">
              <input
                type="number"
                inputMode="numeric"
                placeholder="e.g. 40"
                value={customPct}
                onChange={(e) => { setCustomPct(e.target.value); setProfitPct(null); }}
                className="flex-1 bg-transparent text-sm font-semibold text-foreground outline-none"
                data-testid="input-custom-pct"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        {/* Result */}
        {sellingPrice !== null && costNum > 0 && (
          <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-5 text-white space-y-3">
            <p className="text-sm font-semibold opacity-80 uppercase tracking-wider">Result</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm opacity-80">Selling Price</p>
                <p className="text-4xl font-extrabold tracking-tight">{currencySymbol}{formatCurrency(sellingPrice)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-80">Profit</p>
                <p className="text-xl font-bold">+{currencySymbol}{formatCurrency(profitAmount!)}</p>
              </div>
            </div>
            <div className="border-t border-white/20 pt-3 flex justify-between text-sm">
              <span className="opacity-80">Cost: {currencySymbol}{formatCurrency(costNum)}</span>
              <span className="font-bold">{activePct}% markup</span>
            </div>
          </div>
        )}

        {sellingPrice !== null && (
          <button
            onClick={handleSave}
            className="w-full py-3.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl active:scale-[0.98] transition-transform"
            data-testid="button-save-calculation"
          >
            Save Calculation
          </button>
        )}

        {/* History (Premium) */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <History size={16} className="text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">Recent Calculations</span>
            </div>
            {!isPremium && <PremiumBadge />}
          </div>

          {isPremium ? (
            <div className="divide-y divide-border">
              {calculationHistory.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No saved history yet
                </div>
              ) : (
                calculationHistory.map((h, i) => (
                  <div key={i} className="px-4 py-3 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-foreground">{currencySymbol}{formatCurrency(h.selling)}</p>
                      <p className="text-[10px] text-muted-foreground">{h.profit}% profit from {currencySymbol}{formatCurrency(h.cost)}</p>
                    </div>
                    <span className="text-[9px] text-muted-foreground">{new Date(h.date).toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <PremiumLockedOverlay onUnlock={() => setLocation("/pre-unlock")}>
              <div className="py-10 text-center space-y-2 opacity-30">
                <History size={24} className="mx-auto text-muted-foreground" />
                <p className="text-xs font-medium">Calculation history is a Premium feature</p>
              </div>
            </PremiumLockedOverlay>
          )}
        </div>
      </div>
    </div>
  );
}
