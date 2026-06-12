import { useState, useCallback } from "react";
import { ArrowLeftRight, History, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { PremiumBadge, PremiumLockedOverlay } from "@/components/shared/PremiumBadge";
import { useAppStore } from "@/store/useAppStore";
import { useLocation } from "wouter";

type Unit = "inch" | "cm" | "meter" | "yard";

const UNITS: { value: Unit; label: string; symbol: string }[] = [
  { value: "inch", label: "Inches", symbol: "in" },
  { value: "cm", label: "Centimeters", symbol: "cm" },
  { value: "meter", label: "Meters", symbol: "m" },
  { value: "yard", label: "Yards", symbol: "yd" },
];

const TO_METERS: Record<Unit, number> = {
  inch: 0.0254,
  cm: 0.01,
  meter: 1,
  yard: 0.9144,
};

function convert(value: number, from: Unit, to: Unit): number {
  const meters = value * TO_METERS[from];
  return meters / TO_METERS[to];
}

function formatResult(n: number): string {
  if (isNaN(n) || !isFinite(n)) return "0";
  if (n === 0) return "0";
  if (Math.abs(n) >= 1000) return n.toFixed(2);
  if (Math.abs(n) >= 10) return n.toFixed(3);
  return n.toFixed(4);
}

export default function Converter() {
  const [fromValue, setFromValue] = useState("");
  const [fromUnit, setFromUnit] = useState<Unit>("inch");
  const [toUnit, setToUnit] = useState<Unit>("cm");
  const isPremium = useAppStore((s) => s.isPremium);
  const incrementUsage = useAppStore((s) => s.incrementUsage);
  const measurementHistory = useAppStore((s) => s.measurementHistory);
  const addMeasurementHistory = useAppStore((s) => s.addMeasurementHistory);
  const [, setLocation] = useLocation();

  const numValue = parseFloat(fromValue) || 0;
  const result = fromValue ? convert(numValue, fromUnit, toUnit) : null;

  const handleSwap = useCallback(() => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    if (result !== null) setFromValue(formatResult(result));
  }, [fromUnit, toUnit, result]);

  const handleSave = useCallback(async () => {
    if (result === null || !fromValue) return;
    addMeasurementHistory({
      from: fromUnit,
      to: toUnit,
      value: numValue,
      result,
      date: new Date().toISOString(),
    });
    await incrementUsage();
  }, [result, fromValue, fromUnit, toUnit, numValue, addMeasurementHistory, incrementUsage]);

  const fromSymbol = UNITS.find((u) => u.value === fromUnit)?.symbol ?? "";
  const toSymbol = UNITS.find((u) => u.value === toUnit)?.symbol ?? "";

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader 
        title="Measurement Converter" 
        subtitle="Convert inches, cm, and yards instantly" 
        backPath="/all-tools?cat=measurements"
        backLabel="Tailoring Tools"
      />

      <div className="px-4 py-5 space-y-4">
        {/* From */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">From</label>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={fromValue}
              onChange={(e) => setFromValue(e.target.value)}
              className="flex-1 bg-muted/50 text-foreground text-2xl font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary border border-border min-w-0"
              data-testid="input-from-value"
            />
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value as Unit)}
              className="bg-primary text-primary-foreground font-semibold text-sm px-3 py-3 rounded-xl border-none outline-none cursor-pointer"
              data-testid="select-from-unit"
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>{u.symbol}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwap}
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            data-testid="button-swap"
          >
            <ArrowLeftRight size={20} />
          </button>
        </div>

        {/* To / Result */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">To</label>
          <div className="flex gap-2 items-center">
            <div className="flex-1 bg-muted/50 rounded-xl px-4 py-3 min-w-0">
              <span className="text-2xl font-bold text-primary block">
                {result !== null ? formatResult(result) : "0"}
              </span>
            </div>
            <select
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value as Unit)}
              className="bg-primary text-primary-foreground font-semibold text-sm px-3 py-3 rounded-xl border-none outline-none cursor-pointer"
              data-testid="select-to-unit"
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>{u.symbol}</option>
              ))}
            </select>
          </div>
          {result !== null && (
            <p className="text-sm text-muted-foreground">
              {fromValue} {fromSymbol} = <strong className="text-foreground">{formatResult(result)} {toSymbol}</strong>
            </p>
          )}
        </div>

        {/* Quick conversions */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 5, 10, 20, 36, 100].map((v) => (
            <button
              key={v}
              onClick={() => setFromValue(String(v))}
              className="bg-muted/50 text-foreground text-sm font-semibold py-3 rounded-xl active:scale-95 transition-transform border border-border hover:bg-muted"
              data-testid={`button-quick-${v}`}
            >
              {v} {fromSymbol}
            </button>
          ))}
        </div>

        {result !== null && (
          <button
            onClick={handleSave}
            className="w-full py-3.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl active:scale-[0.98] transition-transform"
            data-testid="button-save-conversion"
          >
            Save Conversion
          </button>
        )}

        {/* History (Premium) */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <History size={16} className="text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">Recent Conversions</span>
            </div>
            {!isPremium && <PremiumBadge />}
          </div>

          {isPremium ? (
            <div className="divide-y divide-border">
              {measurementHistory.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No saved history yet
                </div>
              ) : (
                measurementHistory.map((h, i) => (
                  <div key={i} className="px-4 py-3 flex justify-between items-center" data-testid={`history-item-${i}`}>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {h.value}{h.from} → {formatResult(h.result)}{h.to}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{new Date(h.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <PremiumLockedOverlay onUnlock={() => setLocation("/pre-unlock")}>
              <div className="py-10 text-center space-y-2 opacity-30">
                <History size={24} className="mx-auto text-muted-foreground" />
                <p className="text-xs font-medium">Conversion history is a Premium feature</p>
              </div>
            </PremiumLockedOverlay>
          )}
        </div>
      </div>
    </div>
  );
}
