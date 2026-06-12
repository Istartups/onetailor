import { Lock, Crown, ChevronRight, Zap } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useLocation } from "wouter";

interface PremiumBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export function PremiumBadge({ className = "", size = "sm" }: PremiumBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-bold rounded-full ${
        size === "sm" ? "text-[9px] px-1.5 py-0.5" : "text-xs px-2 py-1"
      } ${className}`}
      style={{
        background: "linear-gradient(135deg, hsl(43,82%,55%), hsl(43,90%,68%))",
        color: "hsl(218,50%,10%)",
      }}
      data-testid="premium-badge"
    >
      <Lock size={size === "sm" ? 8 : 10} strokeWidth={2.5} />
      PREMIUM
    </span>
  );
}

interface PremiumLockedOverlayProps {
  children: React.ReactNode;
  onUnlock: () => void;
}

export function PremiumLockedOverlay({ children, onUnlock }: PremiumLockedOverlayProps) {
  return (
    <div className="relative">
      <div className="pointer-events-none opacity-30 select-none">{children}</div>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer"
        onClick={onUnlock}
        data-testid="premium-locked-overlay"
      >
        <div
          className="rounded-2xl px-5 py-4 flex flex-col items-center gap-2 shadow-xl"
          style={{
            background: "linear-gradient(135deg, hsl(218,44%,12%), hsl(218,44%,15%))",
            border: "1px solid rgba(212,160,32,0.25)",
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(212,160,32,0.15)" }}
          >
            <Lock size={16} style={{ color: "hsl(43,82%,55%)" }} />
          </div>
          <PremiumBadge size="md" />
          <span className="text-xs text-muted-foreground font-medium">Tap to Unlock Premium</span>
        </div>
      </div>
    </div>
  );
}


