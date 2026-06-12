import { useState } from "react";
import { ScanLine, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAppStore } from "@/store/useAppStore";

interface Measurements {
  chest: string;
  waist: string;
  hip: string;
  shoulder: string;
  sleeve: string;
  length: string;
}

interface Warning {
  field: string;
  message: string;
  severity: "error" | "warning";
}

function checkMeasurements(m: Measurements, unit: "inches" | "cm"): Warning[] {
  const factor = unit === "cm" ? 2.54 : 1;
  const parse = (v: string) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n / factor;
  };
  const chest    = parse(m.chest);
  const waist    = parse(m.waist);
  const hip      = parse(m.hip);
  const shoulder = parse(m.shoulder);
  const sleeve   = parse(m.sleeve);
  const length   = parse(m.length);
  const warnings: Warning[] = [];

  if (chest > 0 && waist > 0 && waist > chest * 0.95)
    warnings.push({ field: "Waist", message: "Waist appears unusually large compared to chest. Please verify.", severity: "error" });
  if (hip > 0 && waist > 0 && hip < waist * 0.9)
    warnings.push({ field: "Hip", message: "Hip appears smaller than waist — this is unusual. Please verify.", severity: "warning" });
  if (chest > 0 && shoulder > 0 && shoulder < chest * 0.25)
    warnings.push({ field: "Shoulder", message: "Shoulder width seems very narrow for this chest size.", severity: "warning" });
  if (chest > 0 && shoulder > 0 && shoulder > chest * 0.65)
    warnings.push({ field: "Shoulder", message: "Shoulder width seems very wide for this chest size.", severity: "warning" });
  if (sleeve > 0 && sleeve > 36)
    warnings.push({ field: "Sleeve", message: "Sleeve length is unusually long (over 36 inches). Please verify.", severity: "warning" });
  if (length > 0 && length < 15)
    warnings.push({ field: "Length", message: "Length seems very short (under 15 inches). Please verify.", severity: "warning" });
  if (chest > 0 && chest < 28)
    warnings.push({ field: "Chest", message: "Chest measurement seems very small. Please verify.", severity: "warning" });
  if (chest > 0 && chest > 60)
    warnings.push({ field: "Chest", message: "Chest measurement seems very large. Please verify.", severity: "warning" });
  return warnings;
}

const FIELDS: { key: keyof Measurements; label: string; placeholder: string }[] = [
  { key: "chest",    label: "Chest",    placeholder: "e.g. 38" },
  { key: "waist",    label: "Waist",    placeholder: "e.g. 32" },
  { key: "hip",      label: "Hip",      placeholder: "e.g. 40" },
  { key: "shoulder", label: "Shoulder", placeholder: "e.g. 16" },
  { key: "sleeve",   label: "Sleeve",   placeholder: "e.g. 24" },
  { key: "length",   label: "Length",   placeholder: "e.g. 45" },
];

export default function MeasurementChecker() {
  const addRecentTool = useAppStore((s) => s.addRecentTool);
  const incrementUsage = useAppStore((s) => s.incrementUsage);
  useState(() => { addRecentTool("measurement-checker"); });

  const [unit, setUnit] = useState<"inches" | "cm">("inches");
  const [measurements, setMeasurements] = useState<Measurements>({ chest: "", waist: "", hip: "", shoulder: "", sleeve: "", length: "" });
  const [warnings, setWarnings] = useState<Warning[] | null>(null);
  const inp = "w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-background text-foreground";

  const check = async () => {
    setWarnings(checkMeasurements(measurements, unit));
    await incrementUsage();
  };
  const reset = () => { setMeasurements({ chest: "", waist: "", hip: "", shoulder: "", sleeve: "", length: "" }); setWarnings(null); };
  const hasAnyValue = Object.values(measurements).some((v) => v.trim() !== "");

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader 
        title="Measurement Checker" 
        subtitle="Catch measurement mistakes before production" 
        backPath="/all-tools?cat=measurements"
        backLabel="Tailoring Tools"
      />

      <div className="px-4 py-5 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit</label>
            <div className="flex rounded-xl overflow-hidden border border-border">
              {(["inches", "cm"] as const).map((u) => (
                <button key={u} onClick={() => setUnit(u)}
                  className="px-4 py-1.5 text-xs font-semibold transition-all"
                  style={unit === u ? { background: "rgba(212,160,32,0.15)", color: "hsl(43,82%,60%)" } : { color: "hsl(218,20%,55%)" }}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-[11px] text-muted-foreground block mb-1">{label} ({unit})</label>
                <input type="number" min={0} step={0.5} placeholder={placeholder} value={measurements[key]}
                  onChange={(e) => setMeasurements((prev) => ({ ...prev, [key]: e.target.value }))}
                  className={inp} />
              </div>
            ))}
          </div>
        </div>

        <button onClick={check} disabled={!hasAnyValue}
          className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, hsl(43,82%,50%), hsl(43,90%,62%))", color: "hsl(218,50%,8%)" }}>
          <ScanLine size={16} /> Check Measurements
        </button>

        {warnings !== null && (
          <div className="space-y-3">
            {warnings.length === 0 ? (
              <div className="rounded-2xl p-5 flex items-center gap-3" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)" }}>
                <CheckCircle2 size={22} className="text-emerald-500 shrink-0" />
                <div>
                  <p className="font-bold text-sm text-foreground">All measurements look good!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">No unusual combinations detected.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 px-1">
                  <AlertTriangle size={14} style={{ color: "hsl(349,85%,65%)" }} />
                  <p className="text-xs font-semibold" style={{ color: "hsl(349,85%,65%)" }}>
                    {warnings.length} possible issue{warnings.length > 1 ? "s" : ""} found
                  </p>
                </div>
                {warnings.map((w, i) => (
                  <div key={i} className="rounded-xl p-4 flex items-start gap-3"
                    style={{ background: w.severity === "error" ? "rgba(224,85,85,0.08)" : "rgba(251,191,36,0.08)", border: `1px solid ${w.severity === "error" ? "rgba(224,85,85,0.25)" : "rgba(251,191,36,0.25)"}` }}>
                    <AlertTriangle size={16} style={{ color: w.severity === "error" ? "#e05555" : "hsl(43,95%,58%)", flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p className="text-xs font-bold" style={{ color: w.severity === "error" ? "#e05555" : "hsl(43,95%,55%)" }}>{w.field}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{w.message}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
            <button onClick={reset} className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground py-1 active:scale-95">
              <RefreshCw size={11} /> Clear & Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
