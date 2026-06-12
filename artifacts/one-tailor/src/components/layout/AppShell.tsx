import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import BottomNav from "./BottomNav";
import SideNav from "./SideNav";
import { subscribeToPush } from "@/lib/push-notifications";
import { getDeviceId } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { UsageLockScreen } from "../shared/UsageLockScreen";
import { UsageWarning } from "../shared/UsageWarning";
import { useUsageLimit } from "../../hooks/use-usage-limit";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [location] = useLocation();
  const setIsPremium = useAppStore((s) => s.setIsPremium);
  const setBusinessProfile = useAppStore((s) => s.setBusinessProfile);
  const setReferralData = useAppStore((s) => s.setReferralData);
  const { isAtLimit } = useUsageLimit();

  const hideNavOn = ["/pre-unlock", "/subscription", "/payment"];
  const showNav = !hideNavOn.includes(location);

  useEffect(() => {
    // 1. Verify Premium Status with Server on startup
    const verifyStatus = async () => {
      try {
        const deviceId = getDeviceId();
        const res = await fetch(`/api/profile/${deviceId}`);
        if (!res.ok) {
          console.warn(`[AppShell] Profile fetch failed with status ${res.status}`);
          return;
        }
        
        const text = await res.text();
        if (!text) return;
        
        try {
          const data = JSON.parse(text);
          if (data.user) {
            setIsPremium(data.user.isPremium);
            if (data.profile) setBusinessProfile(data.profile);
            
            // Sync Referral Data
            setReferralData({
              referralCode: data.user.referralCode,
              successfulInvites: data.user.successfulInvites,
              bonusUsageLimit: data.user.bonusUsageLimit,
              referredBy: data.user.referredBy,
              referralConfirmed: data.user.referralConfirmed,
              premiumExpiryDate: data.user.premiumExpiryDate
            });
          }
        } catch (parseErr) {
          console.error("[AppShell] Failed to parse profile JSON:", parseErr);
        }
      } catch (e) {
        console.error("Session verification failed", e);
      }
    };

    verifyStatus();

    // 2. Subscribe to push
    const timer = setTimeout(() => {
      subscribeToPush();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-x-hidden">
      {showNav && <SideNav />}
      <div className={`flex-1 flex flex-col min-h-screen ${showNav ? "md:ml-56" : ""} min-w-0`}>
        {showNav && <UsageWarning />}
        <main className="flex-1 pb-20 md:pb-6 overflow-y-auto w-full overflow-x-hidden">
          <div className="w-full max-w-full overflow-x-hidden">
            {children}
          </div>
        </main>
        {showNav && <BottomNav />}
      </div>
      <UsageLockScreen isOpen={isAtLimit} />
    </div>
  );
}
