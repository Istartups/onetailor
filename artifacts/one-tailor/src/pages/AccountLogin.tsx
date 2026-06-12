import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2, Crown, LogIn, Mail, Lock, ChevronRight } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/shared/PageHeader";

export default function AccountLogin() {
  const [, navigate] = useLocation();
  const setAccount = useAppStore((s) => s.setAccount);
  const setIsPremium = useAppStore((s) => s.setIsPremium);
  const setPendingPremiumRequest = useAppStore((s) => s.setPendingPremiumRequest);
  const setPremiumRequestStatus = useAppStore((s) => s.setPremiumRequestStatus);
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast({ title: "Required", description: "Please enter your email and password.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, rememberMe }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Login Failed", description: data.message, variant: "destructive" });
        return;
      }

      localStorage.setItem("user_token", data.token);
      setAccount(data.user);

      if (data.user.isPremium) {
        setIsPremium(true);
        toast({ title: "Welcome back! ⭐", description: "Premium access restored." });
      } else if (data.pendingPremiumRequest?.canResume) {
        setPendingPremiumRequest(true);
        setPremiumRequestStatus(data.pendingPremiumRequest.status ?? null);
        const statusMsg =
          data.pendingPremiumRequest.status === "payment_submitted"
            ? "Your payment is awaiting admin approval."
            : data.pendingPremiumRequest.status === "rejected"
            ? "Your payment was rejected. Please retry."
            : "You have a pending premium request. Resume payment anytime.";
        toast({ title: "Welcome back!", description: statusMsg });
      } else {
        setPremiumRequestStatus(null);
        toast({ title: "Logged in! 👋", description: "Welcome back to OneTailor." });
      }

      navigate("/home");
    } catch {
      toast({ title: "Error", description: "Check your connection and try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      setForgotSent(true);
    } catch {
      setForgotSent(true); // Don't leak whether email exists
    } finally {
      setForgotLoading(false);
    }
  };

  const inputClass = "w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card border border-border outline-none focus:border-primary transition-colors text-sm";
  const labelClass = "text-xs font-bold uppercase tracking-wider text-muted-foreground";

  if (showForgot) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Reset Password" />
        <div className="max-w-md mx-auto px-4 py-10 space-y-6">
          {forgotSent ? (
            <div className="text-center space-y-4 pt-10">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                <Mail size={32} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                If an account exists for <b>{forgotEmail}</b>, we've sent a reset link.
              </p>
              <button onClick={() => { setShowForgot(false); setForgotSent(false); }} className="text-sm font-semibold text-primary">
                Back to Login
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold">Forgot Password?</h2>
                <p className="text-sm text-muted-foreground">Enter your email and we'll send a reset link.</p>
              </div>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className={labelClass}>Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="your@email.com"
                      className={inputClass}
                      required
                    />
                  </div>
                </div>
                <button type="submit" disabled={forgotLoading} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {forgotLoading ? <Loader2 className="animate-spin" size={18} /> : "Send Reset Link"}
                </button>
                <button type="button" onClick={() => setShowForgot(false)} className="w-full text-sm text-muted-foreground">
                  Back to Login
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Login" />
      <div className="max-w-md mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto border border-primary/20">
            <Crown size={28} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Welcome Back</h1>
            <p className="text-sm text-muted-foreground mt-1">Log in to restore your premium access</p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className={labelClass}>Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={inputClass}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className={`${inputClass} pr-11`}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember Me + Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setRememberMe(!rememberMe)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${rememberMe ? "bg-primary border-primary" : "border-border"}`}
              >
                {rememberMe && <span className="text-primary-foreground text-xs font-bold">✓</span>}
              </div>
              <span className="text-sm text-muted-foreground">Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => { setShowForgot(true); setForgotEmail(email); }}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <><LogIn size={18} /> Log In</>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground">OR</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* Create Account CTA */}
        <div className="p-5 bg-card border border-border rounded-2xl text-center space-y-3">
          <p className="text-sm text-muted-foreground">Don't have a premium account yet?</p>
          <button
            onClick={() => navigate("/pre-unlock")}
            className="flex items-center justify-center gap-2 w-full py-3 border border-primary/40 text-primary rounded-xl font-bold text-sm hover:bg-primary/5 transition-colors"
          >
            <Crown size={16} /> Unlock Premium <ChevronRight size={14} />
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Free tools are always available without an account.
        </p>
      </div>
    </div>
  );
}
