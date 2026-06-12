import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Search, Star, X, Plus, Database, Ruler } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAppStore } from "@/store/useAppStore";
import { ALL_TOOLS, CATEGORY_META, searchTools, type ToolCategory } from "@/lib/tools";
import { useSearch } from "@/hooks/use-search";

const ORDERED_CATEGORIES: ToolCategory[] = ["clients", "measurements", "fabric", "pricing"];

const CLIENT_SHORTCUTS = [
  { label: "Database",       icon: Database, path: "/customer-measurement",            bg: "rgba(59,130,246,0.1)",  color: "hsl(217,91%,60%)" },
  { label: "Add Client",     icon: Plus,     path: "/customer-measurement?action=add", bg: "rgba(59,130,246,0.1)",  color: "hsl(217,91%,60%)" },
  { label: "Measurement",    icon: Ruler,    path: "/customer-measurement?action=measure", bg: "rgba(59,130,246,0.1)", color: "hsl(217,91%,60%)" },
];

type FilterTab = ToolCategory | "fav" | "all";

export default function AllTools() {
  const [, setLocation]            = useLocation();
  const [search, updateSearch]     = useSearch();
  const favorites                  = useAppStore((s) => s.favorites);
  const toggleFavorite             = useAppStore((s) => s.toggleFavorite);
  const addRecentTool              = useAppStore((s) => s.addRecentTool);
  const [query, setQuery]          = useState("");

  const searchParams   = new URLSearchParams(search);
  const catParam       = searchParams.get("cat");
  const activeFilter   = (catParam as FilterTab) || "all";

  const setFilter = (cat: FilterTab) => {
    if (cat === "all") setLocation("/all-tools");
    else updateSearch(`?cat=${cat}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const displayed = useMemo(() => {
    if (query.trim()) return searchTools(query);
    if (activeFilter === "fav") return ALL_TOOLS.filter((t) => favorites.includes(t.id));
    if (activeFilter === "all") return null;
    return ALL_TOOLS.filter((t) => t.category === activeFilter);
  }, [query, activeFilter, favorites]);

  const handleOpen = (toolId: string, path: string) => {
    addRecentTool(toolId);
    setLocation(path);
  };

  const ToolRow = ({ tool }: { tool: (typeof ALL_TOOLS)[number] }) => {
    const isFav = favorites.includes(tool.id);
    const Icon  = tool.icon;
    return (
      <div
        className="flex items-center gap-3 p-3.5 rounded-2xl active:scale-[0.98] transition-transform"
        style={{
          background: "linear-gradient(135deg, hsl(218,44%,11%) 0%, hsl(218,40%,12%) 100%)",
          border: `1px solid ${tool.borderColor}`,
        }}
      >
        <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => handleOpen(tool.id, tool.path)}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: tool.iconBg, border: `1px solid ${tool.borderColor}` }}>
            <Icon size={18} strokeWidth={2} style={{ color: tool.iconColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-bold text-sm" style={{ color: "hsl(43,25%,90%)" }}>{tool.name}</p>
              {tool.premium && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ background: "rgba(212,160,32,0.15)", color: "hsl(43,82%,58%)", border: "1px solid rgba(212,160,32,0.2)" }}>PREMIUM</span>
              )}
              {tool.isNew && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ background: "rgba(74,222,128,0.12)", color: "hsl(142,65%,55%)", border: "1px solid rgba(74,222,128,0.2)" }}>NEW</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{tool.description}</p>
          </div>
        </button>
        <button onClick={() => toggleFavorite(tool.id)}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-90 shrink-0">
          <Star size={16} strokeWidth={2}
            fill={isFav ? "hsl(43,82%,55%)" : "none"}
            style={{ color: isFav ? "hsl(43,82%,55%)" : "hsl(218,20%,45%)" }} />
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="All Tools" subtitle={`${ALL_TOOLS.length} tools for tailors`} backPath="/home" />

      <div className="px-4 pt-2 pb-24 space-y-4">

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search tools…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setFilter("all"); }}
            className="w-full pl-10 pr-10 py-3 rounded-2xl text-sm outline-none border border-border bg-card text-foreground"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground active:scale-90">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter pills */}
        {!query && (
          <div className="flex gap-2 pb-1 overflow-x-auto no-scrollbar">
            {([
              { id: "all",          label: "All",          count: ALL_TOOLS.length },
              { id: "fav",          label: "⭐ Favs",       count: favorites.length },
              { id: "clients",      label: "👥 Clients",    count: ALL_TOOLS.filter(t => t.category === "clients").length },
              { id: "measurements", label: "📏 Measure",    count: ALL_TOOLS.filter(t => t.category === "measurements").length },
              { id: "fabric",       label: "🧵 Fabric",     count: ALL_TOOLS.filter(t => t.category === "fabric").length },
              { id: "pricing",      label: "💰 Pricing",    count: ALL_TOOLS.filter(t => t.category === "pricing").length },
            ] as { id: FilterTab; label: string; count: number }[]).map(({ id, label, count }) => {
              const active = activeFilter === id;
              return (
                <button key={id} onClick={() => setFilter(id)}
                  className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5"
                  style={active
                    ? { background: "rgba(212,160,32,0.15)", borderColor: "rgba(212,160,32,0.4)", color: "hsl(43,82%,60%)" }
                    : { borderColor: "hsl(218,38%,22%)", color: "hsl(218,20%,55%)" }}>
                  {label}
                  <span className="opacity-60 text-[10px] bg-white/5 px-1.5 rounded-md">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Search results count */}
        {query && (
          <p className="text-xs text-muted-foreground px-1">
            {displayed?.length ?? 0} result{(displayed?.length ?? 0) !== 1 ? "s" : ""} for "{query}"
          </p>
        )}

        {/* GROUPED "All" view */}
        {!query && activeFilter === "all" && (
          <div className="space-y-8">
            {ORDERED_CATEGORIES.map((cat) => {
              const meta  = CATEGORY_META[cat];
              const tools = ALL_TOOLS.filter((t) => t.category === cat);
              return (
                <div key={cat}>
                  {/* Section header */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                      style={{ background: meta.bg, border: `1px solid ${meta.borderColor}` }}>
                      {meta.emoji}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-black" style={{ color: meta.color }}>{meta.label}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground">{tools.length} tool{tools.length !== 1 ? "s" : ""}</span>
                    </div>
                    <button onClick={() => setFilter(cat)}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full transition-all"
                      style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.borderColor}` }}>
                      See all
                    </button>
                  </div>

                  {/* Clients quick-action shortcuts */}
                  {cat === "clients" && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {CLIENT_SHORTCUTS.map(({ label, icon: ShIcon, path, bg, color }) => (
                        <button key={label}
                          onClick={() => { setLocation(path); }}
                          className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all active:scale-95"
                          style={{ background: bg, borderColor: "rgba(59,130,246,0.2)" }}>
                          <ShIcon size={18} style={{ color }} />
                          <span className="text-[10px] font-bold" style={{ color }}>{label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tool rows */}
                  <div className="space-y-2">
                    {tools.map((tool) => <ToolRow key={tool.id} tool={tool} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filtered / search list */}
        {(query || activeFilter !== "all") && (
          <div className="space-y-2">
            {(!displayed || displayed.length === 0) ? (
              <div className="text-center py-12">
                <Search size={36} className="text-muted-foreground/25 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No tools found</p>
              </div>
            ) : (
              displayed.map((tool) => <ToolRow key={tool.id} tool={tool} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
