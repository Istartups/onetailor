import { useState } from "react";
import { CalendarClock, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAppStore } from "@/store/useAppStore";

type Complexity = "simple" | "medium" | "complex";

const HOURS: Record<Complexity, number> = { simple: 3, medium: 6, complex: 10 };
const COMPLEXITY_LABELS: Record<Complexity, string> = { simple: "Simple", medium: "Medium", complex: "Complex" };

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function DeliveryDateCalculator() {
  const addRecentTool = useAppStore((s) => s.addRecentTool);
  const incrementUsage = useAppStore((s) => s.incrementUsage);
  useState(() => { addRecentTool("delivery-date"); });

  const [outfits, setOutfits] = useState(3);
  const [complexity, setComplexity] = useState<Complexity>("medium");
  const [tailors, setTailors] = useState(1);
  const [queueJobs, setQueueJobs] = useState(0);
  const [result, setResult] = useState<{ date: Date; workloadHours: number; bufferDays: number } | null>(null);

  const calculate = async () => {
    const totalHours = outfits * HOURS[complexity];
    const workingHoursPerDay = tailors * 8;
    const productionDays = Math.ceil(totalHours / workingHoursPerDay);
    const queueDelay = Math.floor(queueJobs * 0.5);
    const bufferDays = 2;
    const totalDays = productionDays + queueDelay + bufferDays;
    const date = addDays(new Date(), totalDays);
    setResult({ date, workloadHours: totalHours, bufferDays });
    await incrementUsage();
  };

  const inp = "w-full text-sm rounded-xl px-3 py-2.5 outline-none border border-border bg-background text-foreground";
  const card = "bg-card border border-border rounded-2xl p-4";

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader 
        title="Delivery Date Calculator" 
        subtitle="Stop guessing delivery dates" 
        backPath="/all-tools?cat=fabric"
        backLabel="Tailoring Tools"
      />

      <div className="px-4 py-5 space-y-4">
        <div className={card + " space-y-4"}>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Number of Outfits</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setOutfits(Math.max(1, outfits - 1))}
                className="w-10 h-10 rounded-xl border border-border bg-muted/30 flex items-center justify-center text-lg font-bold text-foreground active:scale-95">−</button>
              <span className="flex-1 text-center text-2xl font-bold text-foreground">{outfits}</span>
              <button onClick={() => setOutfits(Math.min(50, outfits + 1))}
                className="w-10 h-10 rounded-xl border border-border bg-muted/30 flex items-center justify-center text-lg font-bold text-foreground active:scale-95">+</button>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Outfit Complexity</label>
            <div className="grid grid-cols-3 gap-2">
              {(["simple", "medium", "complex"] as Complexity[]).map((c) => (
                <button key={c} onClick={() => setComplexity(c)}
                  className={`py-2.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${complexity === c ? "" : "border-border bg-transparent text-muted-foreground"}`}
                  style={complexity === c ? { background: "rgba(212,160,32,0.15)", borderColor: "rgba(212,160,32,0.4)", color: "hsl(43,82%,60%)" } : undefined}>
                  {COMPLEXITY_LABELS[c]}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {complexity === "simple" ? "~3 hrs/outfit" : complexity === "medium" ? "~6 hrs/outfit" : "~10 hrs/outfit"}
            </p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Number of Tailors Working</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setTailors(Math.max(1, tailors - 1))}
                className="w-10 h-10 rounded-xl border border-border bg-muted/30 flex items-center justify-center text-lg font-bold text-foreground active:scale-95">−</button>
              <span className="flex-1 text-center text-2xl font-bold text-foreground">{tailors}</span>
              <button onClick={() => setTailors(Math.min(10, tailors + 1))}
                className="w-10 h-10 rounded-xl border border-border bg-muted/30 flex items-center justify-center text-lg font-bold text-foreground active:scale-95">+</button>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Existing Jobs in Queue</label>
            <input
              type="number"
              min={0}
              max={100}
              value={queueJobs}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setQueueJobs(0);
                } else {
                  setQueueJobs(Math.max(0, parseInt(val, 10) || 0));
                }
              }}
              className={inp}
              placeholder="0"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Jobs waiting before this order</p>
          </div>
        </div>

        <button onClick={calculate}
          className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
          style={{ background: "linear-gradient(135deg, hsl(43,82%,50%), hsl(43,90%,62%))", color: "hsl(218,50%,8%)" }}>
          <CalendarClock size={16} /> Calculate Delivery Date
        </button>

        {result && (
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(99,202,183,0.06)", border: "1px solid rgba(99,202,183,0.25)" }}>
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Recommended Delivery Date</p>
              <p className="text-2xl font-extrabold" style={{ color: "hsl(170,55%,52%)", fontFamily: "'Playfair Display', serif" }}>
                {formatDate(result.date)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Estimated Workload</p>
                <p className="font-bold text-lg text-foreground">{result.workloadHours} hrs</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Safety Buffer</p>
                <p className="font-bold text-lg text-foreground">{result.bufferDays} days</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">Based on 8 working hours per tailor per day</p>
            <button onClick={() => setResult(null)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground py-1 active:scale-95">
              <RefreshCw size={11} /> Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
