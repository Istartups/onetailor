import { useLocation } from "wouter";
import { Clock, AlertTriangle, XCircle, Loader2, ChevronRight } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const DEFAULTS = {
  payment_submitted: {
    icon: Clock,
    iconColor: "#60a5fa",
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.25)",
    label: "Under Review",
    message: "Your payment proof is in the queue — our team is on it! 🎉",
    next: "You'll get an email confirmation once approved. Usually within a few hours.",
    action: null as string | null,
  },
  pending: {
    icon: AlertTriangle,
    iconColor: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    label: "Complete Your Upgrade",
    message: "You're one step away from unlocking the full power of OneTailor Pro! ⭐",
    next: "Tap below to finish your payment and activate your premium tools.",
    action: "Finish Upgrade — Resume Now" as string | null,
  },
  rejected: {
    icon: XCircle,
    iconColor: "#f87171",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    label: "Payment Not Verified",
    message: "We couldn't confirm your last payment. No worries — let's sort it out.",
    next: "Please retry with a clear receipt image, or use Paystack for instant activation.",
    action: "Retry Payment" as string | null,
  },
};

export function PremiumStatusBanner() {
  const account               = useAppStore((s) => s.account);
  const isPremium             = useAppStore((s) => s.isPremium);
  const pendingPremiumRequest = useAppStore((s) => s.pendingPremiumRequest);
  const premiumRequestStatus  = useAppStore((s) => s.premiumRequestStatus);
  const pendingTitle          = useAppStore((s) => s.pendingTitle);
  const pendingBody           = useAppStore((s) => s.pendingBody);
  const pendingCTA            = useAppStore((s) => s.pendingCTA);
  const [, navigate]          = useLocation();

  if (!account || isPremium || !pendingPremiumRequest) return null;

  const baseConfig = premiumRequestStatus && premiumRequestStatus in DEFAULTS
    ? DEFAULTS[premiumRequestStatus as keyof typeof DEFAULTS]
    : DEFAULTS.pending;

  // For the "pending" state, allow admin overrides from system settings
  const config = premiumRequestStatus === "pending"
    ? {
        ...baseConfig,
        label: pendingTitle || baseConfig.label,
        message: pendingBody || baseConfig.message,
        action: pendingCTA || baseConfig.action,
      }
    : baseConfig;

  const Icon = config.icon;

  return (
    <div
      className="mb-4 rounded-2xl p-4 flex gap-3"
      style={{ background: config.bg, border: `1px solid ${config.border}` }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: config.bg, border: `1px solid ${config.border}` }}
      >
        {premiumRequestStatus === "payment_submitted" ? (
          <Loader2 size={18} style={{ color: config.iconColor }} className="animate-spin" />
        ) : (
          <Icon size={18} style={{ color: config.iconColor }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-black uppercase tracking-wider mb-0.5" style={{ color: config.iconColor }}>
          {config.label}
        </p>
        <p className="text-xs text-foreground/80 leading-relaxed">{config.message}</p>
        {premiumRequestStatus !== "pending" && (
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{baseConfig.next}</p>
        )}

        {config.action && (
          <button
            onClick={() => navigate("/pre-unlock")}
            className="mt-2.5 flex items-center gap-1 text-xs font-bold active:scale-95 transition-transform"
            style={{ color: config.iconColor }}
          >
            {config.action} <ChevronRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
