import { useLocation } from "wouter";
import { Clock, AlertTriangle, XCircle, Loader2, ChevronRight } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const STATES = {
  payment_submitted: {
    icon: Clock,
    iconColor: "#60a5fa",
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.25)",
    label: "Awaiting Admin Approval",
    message: "Your payment proof has been submitted and is being reviewed.",
    next: "You'll be notified by email once approved — usually within 24 hrs.",
    action: null,
  },
  pending: {
    icon: AlertTriangle,
    iconColor: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    label: "Payment Pending",
    message: "You started a premium upgrade but haven't completed payment yet.",
    next: "Tap below to complete your premium unlock.",
    action: "Complete your premium unlock",
  },
  rejected: {
    icon: XCircle,
    iconColor: "#f87171",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    label: "Payment Rejected",
    message: "Your previous payment could not be verified by the admin.",
    next: "Please retry with a correct receipt or use Paystack.",
    action: "Retry Payment",
  },
} as const;

export function PremiumStatusBanner() {
  const account               = useAppStore((s) => s.account);
  const isPremium             = useAppStore((s) => s.isPremium);
  const pendingPremiumRequest = useAppStore((s) => s.pendingPremiumRequest);
  const premiumRequestStatus  = useAppStore((s) => s.premiumRequestStatus);
  const [, navigate]          = useLocation();

  if (!account || isPremium || !pendingPremiumRequest) return null;

  const config = premiumRequestStatus && premiumRequestStatus in STATES
    ? STATES[premiumRequestStatus as keyof typeof STATES]
    : STATES.pending;

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
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{config.next}</p>

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
