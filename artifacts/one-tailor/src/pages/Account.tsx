import { Crown, User, LogOut, LogIn, ChevronRight, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/shared/PageHeader";

export default function Account() {
  const account               = useAppStore((s) => s.account);
  const isPremium             = useAppStore((s) => s.isPremium);
  const licenseKey            = useAppStore((s) => s.licenseKey);
  const logout                = useAppStore((s) => s.logout);
  const pendingPremiumRequest = useAppStore((s) => s.pendingPremiumRequest);
  const premiumRequestStatus  = useAppStore((s) => s.premiumRequestStatus);

  const [, setLocation] = useLocation();
  const { toast }       = useToast();

  const maskKey = (key: string) => {
    if (!key) return "";
    if (key.length <= 8) return "****" + key.slice(-4);
    return key.slice(0, 4) + " **** " + key.slice(-4);
  };

  return (
    <div className="max-w-xl mx-auto pb-24">
      <PageHeader title="My Account" subtitle="Manage your profile and subscription" backPath="/home" />

      <div className="px-4 py-5 space-y-5">
        {account ? (
          <>
            {/* Profile card */}
            <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <User size={32} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-lg truncate">{account.businessName || "Your Business"}</p>
                  <p className="text-sm text-muted-foreground truncate">{account.email}</p>
                  {account.phone && <p className="text-xs text-muted-foreground mt-0.5">{account.phone}</p>}
                </div>
              </div>

              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold ${account.isPremium ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-amber-500/10 border-amber-500/20 text-amber-500"}`}>
                <Crown size={16} />
                {account.isPremium ? "⭐ Premium Active — All tools unlocked" : "Free Account — Upgrade to unlock all tools"}
              </div>

              {licenseKey && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border">
                  <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">License Key</p>
                    <p className="text-xs font-mono font-bold truncate">{maskKey(licenseKey)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Pending premium request banner */}
            {!account.isPremium && pendingPremiumRequest && (() => {
              const cfg =
                premiumRequestStatus === "payment_submitted"
                  ? { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", label: "Awaiting Approval", msg: "Your payment proof is in good hands — our team is reviewing it now. ✨ You'll be notified the moment it's confirmed." }
                  : premiumRequestStatus === "rejected"
                  ? { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", label: "Payment Not Confirmed", msg: "No worries — let's sort this together. Tap Resume below to re-upload a clearer proof and we'll get you unlocked fast." }
                  : { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", label: "Complete Your Upgrade", msg: "You're so close! 🌟 Your premium journey started — just one step left. Resume below to unlock everything." };
              return (
                <div className={`p-4 ${cfg.bg} border ${cfg.border} rounded-2xl text-xs ${cfg.text} font-medium space-y-1`}>
                  <p className="font-black uppercase tracking-wider text-[10px]">{cfg.label}</p>
                  <p className="font-normal opacity-90">{cfg.msg}</p>
                </div>
              );
            })()}

            {/* Upgrade CTA */}
            {!account.isPremium && (
              <button
                onClick={() => setLocation("/pre-unlock")}
                className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
              >
                <Crown size={18} />
                {pendingPremiumRequest ? "Resume Premium Upgrade" : "Unlock Premium"}
              </button>
            )}

            {/* Actions */}
            <div className="bg-card border border-border rounded-3xl overflow-hidden">
              <button
                onClick={() => setLocation("/settings")}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors border-b border-border"
              >
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-bold">Settings & Brand Kit</p>
                  <p className="text-xs text-muted-foreground">Configure your business profile</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>

              <button
                onClick={() => {
                  logout();
                  toast({ title: "Logged out", description: "Your session has been cleared." });
                }}
                className="w-full flex items-center gap-4 px-6 py-4 text-red-500 hover:bg-red-500/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <LogOut size={18} className="text-red-500" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-bold">Logout</p>
                  <p className="text-xs text-muted-foreground">Sign out of your account</p>
                </div>
              </button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Premium is restored automatically when you log in on any device.
            </p>
          </>
        ) : (
          <>
            {/* Logged-out state */}
            <div className="bg-card border border-border rounded-3xl p-8 text-center space-y-5">
              <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mx-auto">
                <User size={36} className="text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-black text-xl">No Account Linked</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Create a premium account to sync your data and restore access on any device automatically.
                </p>
              </div>
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => setLocation("/account-login")}
                  className="w-full py-4 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-2xl font-black shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
                >
                  <LogIn size={18} /> Login to Account
                </button>
                <button
                  onClick={() => setLocation("/pre-unlock")}
                  className="w-full py-3.5 flex items-center justify-center gap-2 border border-primary/30 text-primary rounded-2xl font-bold text-sm hover:bg-primary/5 transition-colors"
                >
                  <Crown size={16} /> Create Premium Account
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Free tools are always available without an account.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
