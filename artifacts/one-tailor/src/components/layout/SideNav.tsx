import { useLocation } from "wouter";
import { useMemo } from "react";
import {
  Home, Grid3X3, Star, Crown, Settings, Users2,
  Users, Ruler, Shirt, Tag, UserCircle, Gift
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { ALL_TOOLS, CATEGORY_META } from "@/lib/tools";
import { useSearch } from "@/hooks/use-search";

const CAT_ICONS = {
  clients:      Users,
  measurements: Ruler,
  fabric:       Shirt,
  pricing:      Tag,
} as const;

export default function SideNav() {
  const [location, setLocation] = useLocation();
  const [search]  = useSearch();
  const appName   = useAppStore((s) => s.appName);
  const appLogo   = useAppStore((s) => s.appLogo);
  const favorites = useAppStore((s) => s.favorites);
  const isPremium = useAppStore((s) => s.isPremium);
  const logoSrc   = appLogo ?? "/onetailor-logo.png";
  const nameParts = appName.includes(" ")
    ? [appName.split(" ")[0], appName.split(" ").slice(1).join(" ")]
    : [appName, ""];

  const catCounts = useMemo(() => ({
    clients:      ALL_TOOLS.filter(t => t.category === "clients").length,
    measurements: ALL_TOOLS.filter(t => t.category === "measurements").length,
    fabric:       ALL_TOOLS.filter(t => t.category === "fabric").length,
    pricing:      ALL_TOOLS.filter(t => t.category === "pricing").length,
  }), []);

  const handleNavigate = (path: string) => {
    setLocation(path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const isActive = (path: string) => {
    const full = location + search;
    if (path === "/home") return location === "/home";
    if (path.includes("cat=fav")) return search.includes("cat=fav");
    if (path.includes("?cat=")) return full === path;
    if (path === "/all-tools") return location === "/all-tools" && !search.includes("cat=");
    return location.startsWith(path);
  };

  const NavBtn = ({
    path, label, icon: Icon, count, accent = false
  }: { path: string; label: string; icon: React.ElementType; count?: number; accent?: boolean }) => {
    const active = isActive(path);
    return (
      <button key={path} onClick={() => handleNavigate(path)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.97]"
        style={active
          ? { background: "hsl(218,40%,15%)", color: "hsl(43,82%,60%)", fontWeight: 600, boxShadow: "inset 0 0 0 1px rgba(212,160,32,0.2)" }
          : { color: accent ? "hsl(43,82%,55%)" : "hsl(218,20%,55%)" }}>
        <div className="flex items-center gap-3">
          <Icon size={18} strokeWidth={active ? 2.5 : 1.8}
            style={{ color: active ? "hsl(43,82%,60%)" : accent ? "hsl(43,82%,48%)" : "hsl(218,20%,55%)" }} />
          <span className="truncate">{label}</span>
        </div>
        {count !== undefined && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md transition-colors ${active ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"}`}>
            {count}
          </span>
        )}
      </button>
    );
  };

  const SectionLabel = ({ children }: { children: string }) => (
    <p className="px-3 pt-4 pb-1 text-[9px] font-black uppercase tracking-[0.18em]"
      style={{ color: "rgba(212,160,32,0.35)" }}>
      {children}
    </p>
  );

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen fixed left-0 top-0 bottom-0 z-40 border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div style={{ width: 36, height: 36, borderRadius: 10, overflow: "hidden", border: "1.5px solid rgba(212,160,32,0.35)", flexShrink: 0 }}>
          <img src={logoSrc} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div>
          <div className="flex items-baseline gap-0.5">
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 800, color: "hsl(43,25%,90%)" }}>{nameParts[0]}</span>
            {nameParts[1] && <span className="gold-shimmer" style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 800 }}>{nameParts[1]}</span>}
          </div>
          <p style={{ fontSize: 9, letterSpacing: "0.15em", color: "rgba(212,160,32,0.5)", textTransform: "uppercase", fontWeight: 600 }}>Tailors Toolkit</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {/* Main */}
        <NavBtn path="/home"              label="Home"        icon={Home} />
        <NavBtn path="/all-tools"         label="All Tools"   icon={Grid3X3} count={ALL_TOOLS.length} />
        <NavBtn path="/all-tools?cat=fav" label="Favourites"  icon={Star}    count={favorites.length} />

        {/* Tools by category */}
        <SectionLabel>Tools</SectionLabel>
        {(["clients", "measurements", "fabric", "pricing"] as const).map((cat) => {
          const meta = CATEGORY_META[cat];
          const Icon = CAT_ICONS[cat];
          return (
            <button key={cat}
              onClick={() => handleNavigate(`/all-tools?cat=${cat}`)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.97]"
              style={isActive(`/all-tools?cat=${cat}`)
                ? { background: "hsl(218,40%,15%)", color: "hsl(43,82%,60%)", fontWeight: 600, boxShadow: "inset 0 0 0 1px rgba(212,160,32,0.2)" }
                : { color: "hsl(218,20%,55%)" }}>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs"
                  style={{ background: meta.bg, border: `1px solid ${meta.borderColor}` }}>
                  {meta.emoji}
                </div>
                <span className="truncate">{meta.label}</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isActive(`/all-tools?cat=${cat}`) ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"}`}>
                {catCounts[cat]}
              </span>
            </button>
          );
        })}

        {/* Account section */}
        <SectionLabel>Account</SectionLabel>
        <NavBtn path="/account"      label="My Profile"    icon={UserCircle} />
        <NavBtn path="/invite"       label="Invite & Earn" icon={Gift}        accent />
        <NavBtn path="/pre-unlock"   label={isPremium ? "Premium Active" : "Unlock Premium"} icon={Crown} accent={!isPremium} />
        <NavBtn path="/settings"     label="Settings"      icon={Settings} />
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border">
        <p style={{ fontSize: 10, color: "rgba(212,160,32,0.3)", textAlign: "center", letterSpacing: "0.08em" }}>
          v2.0 · {ALL_TOOLS.length} Tools · Tailors Toolkit
        </p>
      </div>
    </aside>
  );
}
