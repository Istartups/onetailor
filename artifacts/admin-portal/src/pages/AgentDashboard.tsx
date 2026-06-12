import { Link, useLocation } from "wouter";
import { LogOut, MessageSquare, Crown, Sun, Moon, ClipboardList } from "lucide-react";
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function AgentDashboard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_theme");
      if (saved === "dark" || saved === "light") return saved as "light" | "dark";
    }
    return "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const handleLogout = () => {
    localStorage.removeItem("agent_token");
    setLocation("/agent-login");
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("admin_theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const menuItems = [
    { label: "Leads CRM",     icon: MessageSquare, href: "/crm" },
    { label: "Tasks",         icon: ClipboardList,  href: "/crm" },
  ];

  const sidebarStyle = { background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" };
  const activeItemStyle = { background: "rgba(212,160,32,0.12)", color: "hsl(43,82%,55%)", borderRight: "3px solid hsl(43,82%,55%)" };
  const itemStyle = { color: "var(--sidebar-foreground)" };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className={cn("hidden md:flex flex-col w-56 shrink-0")} style={sidebarStyle}>
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} style={{ color: "hsl(43,82%,55%)" }} />
            <span className="font-black text-base" style={{ color: "hsl(43,82%,55%)" }}>OneTailor</span>
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--sidebar-foreground)", opacity: 0.4 }}>Follow-Up Agent</p>
        </div>
        <nav className="flex-1 py-4">
          {menuItems.map((item, i) => {
            const isActive = location === item.href;
            return (
              <Link key={i} href={item.href}>
                <div className="flex items-center gap-3 px-5 py-2.5 text-sm font-semibold cursor-pointer transition-all hover:bg-white/5"
                  style={isActive ? activeItemStyle : itemStyle}>
                  <item.icon size={15} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-sidebar-border space-y-2">
          <button onClick={toggleTheme} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-white/5" style={itemStyle}>
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold">Lead CRM</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors font-semibold">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
