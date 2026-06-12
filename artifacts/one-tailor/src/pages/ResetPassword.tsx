import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2, Lock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/shared/PageHeader";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Extract token from query string (?token=xxx)
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      setToken(t);
    } else {
      setError("Invalid or missing reset link. Please request a new one.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords Don't Match", description: "Please re-enter your new password.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Reset failed. The link may have expired.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-11 pr-11 py-3.5 rounded-2xl bg-card border border-border outline-none focus:border-primary transition-colors text-sm";

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Reset Password" />
      <div className="max-w-md mx-auto px-4 py-10 space-y-8">

        {success ? (
          <div className="text-center space-y-6 pt-8">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Password Reset!</h2>
              <p className="text-sm text-muted-foreground mt-2">Your password has been updated. You can now login with your new password.</p>
            </div>
            <button
              onClick={() => navigate("/account-login")}
              className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold"
            >
              Go to Login
            </button>
          </div>
        ) : error && !token ? (
          <div className="text-center space-y-4 pt-8">
            <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <p className="text-sm text-red-400">{error}</p>
            </div>
            <button onClick={() => navigate("/account-login")} className="text-sm text-primary font-semibold">
              Back to Login
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Create New Password</h2>
              <p className="text-sm text-muted-foreground">Enter and confirm your new password below.</p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className={inputClass}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className={`${inputClass} ${confirmPassword && password !== confirmPassword ? "border-red-500" : ""}`}
                    required
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 ml-1">Passwords don't match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Reset Password"}
              </button>

              <button type="button" onClick={() => navigate("/account-login")} className="w-full text-sm text-muted-foreground">
                Back to Login
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
