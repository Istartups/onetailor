import { useState } from "react";
import { Shirt, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAppStore } from "@/store/useAppStore";

type Gender = "male" | "female";
type Height = "short" | "medium" | "tall";
type BodySize = "S" | "M" | "L" | "XL" | "XXL";
type Region = "Nigeria" | "Africa" | "Global";

interface GarmentOption {
  id: string;
  label: string;
  gender: Gender | "both";
  region: Region;
}

const GARMENTS: GarmentOption[] = [
  // Nigeria
  { id: "senator",         label: "Senator",                gender: "male",   region: "Nigeria" },
  { id: "agbada",          label: "Agbada (3-piece)",       gender: "male",   region: "Nigeria" },
  { id: "buba-male",       label: "Buba & Shokoto",         gender: "male",   region: "Nigeria" },
  { id: "kaftan",          label: "Kaftan",                 gender: "male",   region: "Nigeria" },
  { id: "isi-agu",         label: "Isi Agu",                gender: "male",   region: "Nigeria" },
  { id: "native-set",      label: "Native Set",             gender: "male",   region: "Nigeria" },
  { id: "ankara-gown",     label: "Ankara Gown",            gender: "female", region: "Nigeria" },
  { id: "iro-buba",        label: "Iro & Buba",             gender: "female", region: "Nigeria" },

  // Africa
  { id: "kente",           label: "Kente Outfit",           gender: "both",   region: "Africa"  },
  { id: "kitenge",         label: "Kitenge Dress",          gender: "female", region: "Africa"  },
  { id: "african-suit",    label: "African Suit",           gender: "male",   region: "Africa"  },
  { id: "dashiki",         label: "Dashiki Outfit",         gender: "both",   region: "Africa"  },

  // Global
  { id: "suit",            label: "Suit (2-piece)",         gender: "both",   region: "Global"  },
  { id: "blazer",          label: "Blazer",                 gender: "both",   region: "Global"  },
  { id: "shirt",           label: "Shirt",                  gender: "both",   region: "Global"  },
  { id: "polo",            label: "Polo",                   gender: "both",   region: "Global"  },
  { id: "tshirt",          label: "T-Shirt",                gender: "both",   region: "Global"  },
  { id: "hoodie",          label: "Hoodie",                 gender: "both",   region: "Global"  },
  { id: "jeans",           label: "Jeans",                  gender: "both",   region: "Global"  },
  { id: "skirt",           label: "Skirt",                  gender: "female", region: "Global"  },
  { id: "jumpsuit",        label: "Jumpsuit",               gender: "female", region: "Global"  },
  { id: "evening-gown",    label: "Evening Gown",           gender: "female", region: "Global"  },
  { id: "wedding-dress",   label: "Wedding Dress",          gender: "female", region: "Global"  },
  { id: "corporate-dress", label: "Corporate Dress",        gender: "female", region: "Global"  },
];

interface FabricOutput {
  main: number;
  lining: number;
  interfacing: number;
  extra: { name: string; yards: number }[];
}

const SIZE_FACTOR: Record<BodySize, number> = { S: -0.25, M: 0, L: 0.25, XL: 0.5, XXL: 0.75 };
const HEIGHT_FACTOR: Record<Height, number> = { short: -0.25, medium: 0, tall: 0.5 };

function calculateFabric(garment: string, height: Height, bodySize: BodySize): FabricOutput {
  const hf = HEIGHT_FACTOR[height];
  const sf = SIZE_FACTOR[bodySize];
  const adj = hf + sf;

  const lookup: Record<string, FabricOutput> = {
    "senator":        { main: 4 + adj,  lining: 2,             interfacing: 0.5, extra: [] },
    "agbada":         { main: 12 + adj, lining: 4 + adj * 0.5, interfacing: 1, extra: [{ name: "Embroidery thread", yards: 2 }] },
    "buba-male":      { main: 5 + adj,  lining: 0,             interfacing: 0.25, extra: [] },
    "kaftan":         { main: 6 + adj,  lining: 2,             interfacing: 0.5, extra: [] },
    "isi-agu":        { main: 4 + adj,  lining: 2,             interfacing: 0.5, extra: [] },
    "native-set":     { main: 6 + adj,  lining: 2,             interfacing: 0.5, extra: [] },
    "ankara-gown":    { main: 6 + adj,  lining: 2.5 + adj * 0.5, interfacing: 0.5, extra: [] },
    "iro-buba":       { main: 6 + adj,  lining: 0,             interfacing: 0, extra: [{ name: "Gele", yards: 2 }] },
    "kente":          { main: 8 + adj,  lining: 2,             interfacing: 0.5, extra: [] },
    "kitenge":        { main: 6 + adj,  lining: 2,             interfacing: 0.5, extra: [] },
    "african-suit":   { main: 5 + adj,  lining: 3,             interfacing: 1.5, extra: [] },
    "dashiki":        { main: 4 + adj,  lining: 0,             interfacing: 0.25, extra: [] },
    "suit":           { main: 4 + adj,  lining: 3 + adj * 0.5, interfacing: 1.5, extra: [{ name: "Trouser", yards: 2 + adj * 0.5 }] },
    "blazer":         { main: 2.5 + adj, lining: 2 + adj * 0.5, interfacing: 1, extra: [] },
    "shirt":          { main: 2.5 + adj, lining: 0,             interfacing: 0.25, extra: [] },
    "polo":           { main: 1.5 + adj, lining: 0,             interfacing: 0, extra: [] },
    "tshirt":         { main: 1.5 + adj, lining: 0,             interfacing: 0, extra: [] },
    "hoodie":         { main: 2.5 + adj, lining: 0,             interfacing: 0, extra: [] },
    "jeans":          { main: 2.5 + adj, lining: 0,             interfacing: 0, extra: [] },
    "skirt":          { main: 2.5 + adj * 0.3, lining: 1.5, interfacing: 0.5, extra: [] },
    "jumpsuit":       { main: 4.5 + adj, lining: 2,             interfacing: 0.5, extra: [] },
    "evening-gown":   { main: 6 + adj * 1.5, lining: 4 + adj,   interfacing: 0.5, extra: [] },
    "wedding-dress":  { main: 12 + adj * 2, lining: 8 + adj,    interfacing: 1, extra: [{ name: "Tulle/Veil", yards: 5 }] },
    "corporate-dress": { main: 3.5 + adj, lining: 2,             interfacing: 0.5, extra: [] },
  };

  const base = lookup[garment] ?? { main: 4, lining: 2, interfacing: 0.5, extra: [] };
  const round = (n: number) => Math.max(0.5, Math.round(n * 4) / 4);
  return {
    main: round(base.main),
    lining: round(base.lining),
    interfacing: round(base.interfacing),
    extra: base.extra.map((e) => ({ ...e, yards: round(e.yards) })),
  };
}

export default function FabricRequirementCalculator() {
  const addRecentTool = useAppStore((s) => s.addRecentTool);
  const incrementUsage = useAppStore((s) => s.incrementUsage);
  useState(() => { addRecentTool("fabric-requirement"); });

  const [gender, setGender] = useState<Gender>("male");
  const [garment, setGarment] = useState<string>("");
  const [height, setHeight] = useState<Height>("medium");
  const [bodySize, setBodySize] = useState<BodySize>("M");
  const [result, setResult] = useState<FabricOutput | null>(null);
  const [expandedRegion, setExpandedRegion] = useState<Region | null>("Nigeria");

  const availableGarments = GARMENTS.filter((g) => g.gender === gender || g.gender === "both");
  const regions: Region[] = ["Nigeria", "Africa", "Global"];

  const calculate = async () => {
    if (!garment) return;
    setResult(calculateFabric(garment, height, bodySize));
    await incrementUsage();
  };

  const chip = (active: boolean) =>
    `px-3 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${active ? "" : "border-border bg-transparent text-muted-foreground"}`;
  const chipStyle = (active: boolean) =>
    active ? { background: "rgba(212,160,32,0.15)", borderColor: "rgba(212,160,32,0.4)", color: "hsl(43,82%,60%)" } : undefined;

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader 
        title="Fabric Requirement" 
        subtitle="Estimate fabric needs instantly" 
        backPath="/all-tools?cat=fabric"
        backLabel="Tailoring Tools"
      />
      <div className="px-4 py-5 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-2">Gender</label>
            <div className="flex gap-2">
              {(["male", "female"] as Gender[]).map((g) => (
                <button key={g} onClick={() => { setGender(g); setGarment(""); setResult(null); }}
                  className={`flex-1 ${chip(gender === g)}`} style={chipStyle(gender === g)}>
                  {g === "male" ? "Male" : "Female"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-2">Garment Style</label>
            <div className="space-y-2">
              {regions.map((region) => {
                const regionGarments = availableGarments.filter((g) => g.region === region);
                if (regionGarments.length === 0) return null;
                const isExpanded = expandedRegion === region;
                return (
                  <div key={region} className="border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedRegion(isExpanded ? null : region)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-muted/20 text-xs font-bold text-muted-foreground uppercase tracking-wider"
                    >
                      {region}
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {isExpanded && (
                      <div className="p-2 flex flex-wrap gap-2">
                        {regionGarments.map((g) => (
                          <button key={g.id} onClick={() => { setGarment(g.id); setResult(null); }}
                            className={chip(garment === g.id)} style={chipStyle(garment === g.id)}>
                            {g.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-2">Customer Height</label>
            <div className="grid grid-cols-3 gap-2">
              {([["short", "Short"], ["medium", "Medium"], ["tall", "Tall"]] as [Height, string][]).map(([h, label]) => (
                <button key={h} onClick={() => { setHeight(h); setResult(null); }}
                  className={chip(height === h)} style={chipStyle(height === h)}>{label}</button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Short &lt;5′4″ · Medium 5′4″–5′10″ · Tall &gt;5′10″</p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-2">Body Size</label>
            <div className="flex gap-2">
              {(["S", "M", "L", "XL", "XXL"] as BodySize[]).map((s) => (
                <button key={s} onClick={() => { setBodySize(s); setResult(null); }}
                  className={`flex-1 ${chip(bodySize === s)}`} style={chipStyle(bodySize === s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={calculate} disabled={!garment}
          className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, hsl(43,82%,50%), hsl(43,90%,62%))", color: "hsl(218,50%,8%)" }}>
          <Shirt size={16} /> Calculate Fabric Requirement
        </button>

        {result && (
          <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.25)" }}>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recommended Fabric</p>
            <div className="space-y-2">
              <FabricRow label="Main Fabric" yards={result.main} />
              {result.lining > 0 && <FabricRow label="Lining" yards={result.lining} />}
              {result.interfacing > 0 && <FabricRow label="Interfacing" yards={result.interfacing} />}
              {result.extra.map((e) => <FabricRow key={e.name} label={e.name} yards={e.yards} />)}
            </div>
            <p className="text-[11px] text-muted-foreground">Estimates vary by design. Add 0.5 yard for complex styles.</p>
            <button onClick={() => setResult(null)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground pt-1 active:scale-95">
              <RefreshCw size={11} /> Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FabricRow({ label, yards }: { label: string; yards: number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-foreground/80">{label}</span>
      <span className="font-bold text-sm" style={{ color: "hsl(262,75%,68%)" }}>{yards} yards</span>
    </div>
  );
}
