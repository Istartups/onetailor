import { useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useLocation } from "wouter";
import { useToast } from "./use-toast";

export function useUsageLimit() {
  const isPremium = useAppStore((s) => s.isPremium);
  const totalUsageCount = useAppStore((s) => s.totalUsageCount);
  const globalUsageLimit = useAppStore((s) => s.globalUsageLimit);
  const bonusUsageLimit = useAppStore((s) => s.bonusUsageLimit);
  const incrementUsage = useAppStore((s) => s.incrementUsage);
  const premiumExpiryDate = useAppStore((s) => s.premiumExpiryDate);
  const isUsageLimitEnabled = useAppStore((s) => s.isUsageLimitEnabled);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const isTempPremium = premiumExpiryDate && new Date(premiumExpiryDate) > new Date();
  const effectiveLimit = globalUsageLimit + bonusUsageLimit;
  
  // Only at limit if enforcement is ENABLED and user is not premium
  const isAtLimit = isUsageLimitEnabled && !isPremium && !isTempPremium && totalUsageCount >= effectiveLimit;
  const isNearLimit = isUsageLimitEnabled && !isPremium && !isTempPremium && totalUsageCount >= effectiveLimit - 5;
  const remaining = isUsageLimitEnabled ? Math.max(0, effectiveLimit - totalUsageCount) : 999;

  const checkAndIncrement = useCallback(async (showInvitePrompt = true) => {
    // If not enabled, always allow and don't increment (or increment for stats but don't block)
    // Here we increment for stats but return true regardless of limit
    const success = await incrementUsage();
    
    if (!isUsageLimitEnabled) return true;
    if (isPremium || isTempPremium) return true;
    
    if (totalUsageCount >= effectiveLimit) {
      return false;
    }

    if (success && showInvitePrompt && (totalUsageCount + 1) % 5 === 0) {
      // Show invite prompt every 5 tool actions
      setTimeout(() => {
        toast({
          title: "Enjoying OneTailor?",
          description: "Invite another tailor and unlock bonus usage!",
          action: (
            <button 
              onClick={() => setLocation("/invite")}
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-bold"
            >
              Invite
            </button>
          )
        });
      }, 1000);
    }

    return success;
  }, [isPremium, isTempPremium, totalUsageCount, effectiveLimit, incrementUsage, toast, setLocation]);

  const redirectToUnlock = useCallback(() => {
    setLocation("/pre-unlock");
  }, [setLocation]);

  return {
    isPremium: isPremium || isTempPremium,
    totalUsageCount,
    globalUsageLimit: effectiveLimit,
    isAtLimit,
    isNearLimit,
    remaining,
    checkAndIncrement,
    redirectToUnlock
  };
}
