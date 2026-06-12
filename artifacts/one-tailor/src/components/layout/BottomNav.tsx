import { useLocation } from "wouter";
import { Home, Star, Gift, UserCircle, Settings } from "lucide-react";
import { useSearch } from "@/hooks/use-search";
const navItems = [
  { path: "/home",              label: "Home",    icon: Home     },
  { path: "/all-tools?cat=fav", label: "Favs",    icon: Star     },
  { path: "/invite",            label: "Invite",  icon: Gift     },
  { path: "/account",           label: "Account", icon: UserCircle },
  { path: "/settings",          label: "Settings",icon: Settings },
];

export default function BottomNav() {
  const [location, setLocation] = useLocation();
  const [search] = useSearch();

  const handleNavigate = (path: string) => {
    setLocation(path);
    if (path.includes("?")) window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const isActive = (path: string) => {
    const full = location + search;
    if (path === "/home") return location === "/home";
    if (path.includes("?cat=")) return full === path;
    if (path === "/all-tools") return location === "/all-tools" && !search;
    return location === path || (path !== "/home" && location.startsWith(path));
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border"
      style={{ background: "hsl(218,47%,8%)" }}
      data-testid="bottom-nav"
    >
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = isActive(path);
          return (
            <button
              key={path}
              onClick={() => handleNavigate(path)}
              data-testid={`nav-${label.toLowerCase()}`}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-all duration-150 active:scale-90 relative"
            >
              {active && (
                <div className="absolute w-8 h-8 rounded-full" style={{ background: "rgba(212,160,32,0.12)" }} />
              )}
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8}
                style={{ color: active ? "hsl(43,82%,55%)" : "hsl(218,20%,50%)", position: "relative" }} />
              <span className="text-[9px] font-medium relative"
                style={{ color: active ? "hsl(43,82%,55%)" : "hsl(218,20%,50%)" }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
