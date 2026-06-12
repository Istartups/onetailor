import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  CreditCard, 
  KeyRound, 
  LogOut, 
  Menu, 
  X, 
  Crown,
  Settings,
  Sun,
  Moon,
  BookOpen,
  Bell,
  Users,
  MessageSquare,
  ScrollText,
  Share2
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function Dashboard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("admin_theme");
      if (savedTheme === "dark" || savedTheme === "light") return savedTheme as "light" | "dark";
    }
    return "dark";
  });

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setLocation("/login");
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("admin_theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const menuItems = [
    { label: "Overview",        icon: LayoutDashboard, href: "/overview" },
    { label: "Lead CRM",        icon: MessageSquare,   href: "/crm" },
    { label: "Accounts",        icon: Users,            href: "/accounts" },
    { label: "License",         icon: KeyRound,         href: "/licenses" },
    { label: "Payment",         icon: CreditCard,       href: "/payment" },
    { label: "Payment Settings",icon: Settings,         href: "/payment-settings" },
    { label: "Broadcast",       icon: Bell,             href: "/broadcast" },
    { label: "System Settings", icon: Settings,         href: "/settings" },
    { label: "Referrals",        icon: Share2,           href: "/referrals" },
    { label: "System Logs",     icon: ScrollText,       href: "/logs" },
    { label: "Deploy Guide",    icon: BookOpen,         href: "/deploy-guide" },
  ];

  const sidebarStyle = { background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" };
  const activeItemStyle = { background: "rgba(212,160,32,0.12)", color: "hsl(43,82%,55%)", borderRight: "3px solid hsl(43,82%,55%)" };
  const itemStyle = { color: "var(--sidebar-foreground)" };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col w-56 shrink-0 transition-all duration-300",
          mobileMenuOpen && "flex fixed inset-y-0 left-0 z-50 w-56"
        )}
        style={sidebarStyle}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Crown size={20} style={{ color: "hsl(43,82%,55%)" }} />
            <span className="font-black text-base" style={{ color: "hsl(43,82%,55%)" }}>OneTailor</span>
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--sidebar-foreground)", opacity: 0.4 }}>Admin Portal</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className="flex items-center gap-3 px-5 py-2.5 text-sm font-semibold cursor-pointer transition-all hover:bg-white/5"
                  style={isActive ? activeItemStyle : itemStyle}
                >
                  <item.icon size={15} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
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

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <aside className="fixed inset-y-0 left-0 z-50 w-56 flex flex-col md:hidden" style={sidebarStyle}>
          <div className="px-5 py-5 border-b border-sidebar-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown size={20} style={{ color: "hsl(43,82%,55%)" }} />
              <span className="font-black text-base" style={{ color: "hsl(43,82%,55%)" }}>OneTailor</span>
            </div>
            <button onClick={() => setMobileMenuOpen(false)}><X size={18} /></button>
          </div>
          <nav className="flex-1 py-4 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-5 py-2.5 text-sm font-semibold cursor-pointer transition-all hover:bg-white/5"
                    style={isActive ? activeItemStyle : itemStyle}
                  >
                    <item.icon size={15} />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
          <div className="px-4 py-4 border-t border-sidebar-border">
            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors">
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
          <button className="md:hidden p-1.5 rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu size={20} />
          </button>
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold capitalize">{location.replace("/", "") || "Dashboard"}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
              <LogOut size={14} className="mr-1.5" /> Logout
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
