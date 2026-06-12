import { ChevronLeft, Crown, ShieldCheck, X, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { ReactNode, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightElement?: ReactNode;
  backPath?: string;
  backLabel?: string;
  onBack?: () => void;
}

export function PageHeader({ title, subtitle, rightElement, backPath = "/home", backLabel, onBack }: PageHeaderProps) {
  const isPremium = useAppStore((s) => s.isPremium);
  const [location, setLocation] = useLocation();

  const hideUpgradeOn = ["/pre-unlock", "/subscription", "/payment", "/settings"];
  const shouldShowUpgrade = !hideUpgradeOn.includes(location);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setLocation(backPath);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-40 backdrop-blur-md border-b border-border" style={{ background: "hsl(var(--background) / 0.92)" }}>
        <div className="flex items-center justify-between px-4 h-14 max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className="group flex items-center gap-1.5 py-1.5 pr-3 rounded-full hover:bg-muted transition-colors active:scale-95"
              data-testid="button-back"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              {backLabel && <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">{backLabel}</span>}
            </button>
          </div>

          <div className="flex-1 text-center truncate px-2">
            <h1 className="text-sm font-black uppercase tracking-widest truncate">{title}</h1>
            {subtitle && <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight truncate">{subtitle}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 min-w-[64px]">
            {rightElement}
            {shouldShowUpgrade && (
              <button
                onClick={() => setLocation("/pre-unlock")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95 shadow-lg shadow-primary/20"
                style={{
                  background: isPremium 
                    ? "rgba(16,185,129,0.1)" 
                    : "linear-gradient(135deg, hsl(43,82%,55%), hsl(43,90%,68%))",
                  border: isPremium ? "1px solid rgba(16,185,129,0.2)" : "none"
                }}
              >
                {isPremium ? (
                  <>
                    <ShieldCheck size={12} className="text-emerald-500" />
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Premium Active</span>
                  </>
                ) : (
                  <>
                    <Crown size={12} className="text-primary-foreground fill-current" />
                    <span className="text-[9px] font-black text-primary-foreground uppercase tracking-widest">Unlock Premium</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
