import { useState, useEffect, useRef } from "react";
import {
  Loader2, Crown, ShieldCheck, LogIn, ChevronRight, Mail, Lock,
  Eye, EyeOff, Building2, Phone, X, RefreshCw, Upload, Check,
  AlertCircle, MapPin, Smartphone
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { getDeviceId, validateName, validatePhone } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

function PendingNotifySupportButton({ account }: { account: any }) {
  const adminNotificationPhone = useAppStore((s) => s.adminNotificationPhone);

  const handleNotify = () => {
    const phone = adminNotificationPhone?.replace(/\D/g, "");
    if (!phone) return;
    const msg = `Hello, I submitted payment proof for OneTailor Premium but it's still pending verification.\n\nAccount: ${account?.email || "N/A"}\nBusiness: ${account?.businessName || "N/A"}\n\nPlease help me confirm my payment. Thank you!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <a href="/home" className="px-8 py-3 bg-secondary text-secondary-foreground rounded-xl font-bold inline-flex items-center justify-center gap-2">
        Back to Toolkit
      </a>
      {adminNotificationPhone && (
        <button
          onClick={handleNotify}
          className="px-8 py-3 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.134.558 4.134 1.535 5.867L0 24l6.335-1.66A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.655-.502-5.186-1.381l-.372-.221-3.863 1.013 1.032-3.764-.242-.389A9.937 9.937 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
          Notify Support
        </button>
      )}
    </div>
  );
}

const CLIENT_RANGES = [
  { label: "1-5 clients",   emoji: "🌱" },
  { label: "6-15 clients",  emoji: "📈" },
  { label: "16-30 clients", emoji: "🔥" },
  { label: "30+ clients",   emoji: "👑" },
];

const CHALLENGES = [
  { id: "measuring", label: "Measuring clients accurately", emoji: "📏" },
  { id: "followup",  label: "Following up with clients",    emoji: "📱" },
  { id: "pricing",   label: "Setting the right price",      emoji: "💰" },
  { id: "records",   label: "Keeping proper records",       emoji: "📋" },
];

const DEVICE_OPTIONS = [
  { count: 1, label: "Just Me",       sub: "1 device",              emoji: "📱" },
  { count: 2, label: "Me + 1 More",   sub: "2 devices",             emoji: "📱📱" },
  { count: 3, label: "Small Team",    sub: "3 devices",             emoji: "📱📱📱" },
  { count: 5, label: "Full Workshop", sub: "5 devices · Best value", emoji: "🏪" },
];

type QStep =
  | "client_count" | "challenge" | "gender"
  | "location" | "devices" | "account"
  | "pending" | "rejected_reupload" | "success";

const TOTAL_QUESTION_STEPS = 6;
const stepIndex: Record<string, number> = {
  client_count: 0, challenge: 1, gender: 2, location: 3, devices: 4, account: 5,
};

const slideVariants = {
  enter:  { x: 40, opacity: 0 },
  center: { x: 0,  opacity: 1 },
  exit:   { x: -40, opacity: 0 },
};

export default function PreUnlock() {
  const isPremium                = useAppStore((s) => s.isPremium);
  const account                  = useAppStore((s) => s.account);
  const setAccount               = useAppStore((s) => s.setAccount);
  const setIsPremium             = useAppStore((s) => s.setIsPremium);
  const setBusinessProfile       = useAppStore((s) => s.setBusinessProfile);
  const setPendingPremiumRequest = useAppStore((s) => s.setPendingPremiumRequest);
  const premiumRequestStatus     = useAppStore((s) => s.premiumRequestStatus);
  const businessProfile          = useAppStore((s) => s.businessProfile);
  const selectedDeviceCount      = useAppStore((s) => s.selectedDeviceCount);
  const setSelectedDeviceCount   = useAppStore((s) => s.setSelectedDeviceCount);

  const { toast }    = useToast();
  const [, navigate] = useLocation();
  const [, params]   = useRoute("/pre-unlock/:sub");
  const subRoute     = (params as any)?.sub as string | undefined;

  const getInitialStep = (): QStep => {
    if (subRoute === "success") return "success";
    if (account) {
      if (premiumRequestStatus === "payment_submitted") return "pending";
      if (premiumRequestStatus === "rejected")          return "rejected_reupload";
    }
    return "client_count";
  };

  const [step, setStep]         = useState<QStep>(getInitialStep);
  const [processing, setProcessing] = useState(false);

  const [answers, setAnswers] = useState({
    clientRange:     "",
    challenge:       "",
    gender:          "" as "male" | "female" | "",
    city:            businessProfile?.addressDetails?.city || (businessProfile?.address?.split(",")[0]?.trim() || ""),
    state:           businessProfile?.addressDetails?.state || (businessProfile?.address?.split(",")[1]?.trim() || ""),
    name:            businessProfile?.name || "",
    phone:           "",
    email:           businessProfile?.email || "",
    password:        "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword]               = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailAvailable, setEmailAvailable]           = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail]             = useState(false);
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [evidence, setEvidence]               = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes]         = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (subRoute === "success") { setStep("success"); setIsPremium(true); return; }
    if (account) {
      if (premiumRequestStatus === "payment_submitted") { setStep("pending"); return; }
      if (premiumRequestStatus === "rejected")          { setStep("rejected_reupload"); return; }
      navigate("/premium-details");
    }
  }, [account, premiumRequestStatus, subRoute]);

  const checkEmailAvailability = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailAvailable(null); return; }
    setCheckingEmail(true);
    try {
      const res  = await fetch("/api/auth/check-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json();
      setEmailAvailable(data.available);
    } catch { setEmailAvailable(null); }
    finally  { setCheckingEmail(false); }
  };

  const handleEmailChange = (email: string) => {
    setAnswers(a => ({ ...a, email }));
    clearTimeout(emailCheckTimer.current);
    emailCheckTimer.current = setTimeout(() => checkEmailAvailability(email), 600);
  };

  const pick = (field: keyof typeof answers, value: string, next: QStep, delay = 260) => {
    setAnswers(a => ({ ...a, [field]: value }));
    setTimeout(() => setStep(next), delay);
  };

  const pickDevice = (count: number, next: QStep, delay = 260) => {
    setSelectedDeviceCount(count);
    setTimeout(() => setStep(next), delay);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameVal = validateName(answers.name);
    if (!nameVal.valid) { toast({ title: "Invalid Name", description: nameVal.message, variant: "destructive" }); return; }
    const phoneVal = validatePhone(answers.phone);
    if (!phoneVal.valid) { toast({ title: "Invalid Phone", description: phoneVal.message, variant: "destructive" }); return; }
    if (!answers.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email.", variant: "destructive" }); return;
    }
    if (emailAvailable === false) {
      toast({ title: "Email Taken", description: "This email is registered. Login instead.", variant: "destructive" }); return;
    }
    if (!answers.password || answers.password.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" }); return;
    }
    if (answers.password !== answers.confirmPassword) {
      toast({ title: "Passwords Don't Match", description: "Please re-enter your password.", variant: "destructive" }); return;
    }
    setProcessing(true);
    try {
      const res  = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId:     getDeviceId(),
          businessName: answers.name,
          phone:        answers.phone,
          email:        answers.email,
          password:     answers.password,
          city:         answers.city  || undefined,
          state:        answers.state || undefined,
          country:      "Nigeria",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.shouldLogin) {
          toast({ title: "Account Exists", description: "This email is already registered.", variant: "destructive" });
          navigate("/account-login");
          return;
        }
        toast({ title: "Registration Failed", description: data.message, variant: "destructive" });
        return;
      }
      localStorage.setItem("user_token", data.token);
      setAccount(data.user);
      setBusinessProfile({
        name:        answers.name,
        phone:       answers.phone,
        email:       answers.email,
        address:     [answers.city, answers.state].filter(Boolean).join(", "),
        socials:     businessProfile?.socials,
        brandColors: businessProfile?.brandColors,
      });
      toast({ title: "Account Created! ✅", description: "See your premium options." });
      navigate("/premium-details");
    } catch {
      toast({ title: "Network Error", description: "Could not complete registration.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectResubmit = async () => {
    if (!evidence) { toast({ title: "Upload Required", description: "Please upload your payment proof.", variant: "destructive" }); return; }
    setProcessing(true);
    try {
      const fd = new FormData();
      fd.append("deviceId", account?.deviceId || getDeviceId());
      fd.append("evidence", evidence);
      fd.append("amount", "0");
      if (rejectNotes) fd.append("notes", rejectNotes);
      const res = await fetch("/api/payment/manual", { method: "POST", body: fd });
      if (res.ok) {
        setPendingPremiumRequest(true);
        setStep("pending");
        toast({ title: "Proof Resubmitted", description: "We'll verify your payment again shortly." });
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.message || "Failed to submit.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network Error", description: "Could not submit. Please try again.", variant: "destructive" });
    } finally { setProcessing(false); }
  };

  const inp  = "w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card border border-border outline-none focus:border-primary transition-colors text-sm";
  const lbl  = "text-xs font-bold uppercase tracking-wider text-muted-foreground";

  const currentIdx    = stepIndex[step] ?? -1;
  const isQuestionStep = currentIdx >= 0;

  if (isPremium && step !== "success") {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-6">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto border border-primary/20">
          <ShieldCheck size={40} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Premium Active</h1>
        <p className="text-muted-foreground">All professional tools are unlocked.</p>
        <button onClick={() => navigate("/premium-activated")} className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold">
          View Membership
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 pb-20 pt-6 min-h-screen flex flex-col">

      {/* Progress bar — only for Q steps */}
      {isQuestionStep && (
        <div className="mb-6 space-y-3">
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_QUESTION_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${i <= currentIdx ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground font-semibold">Step {currentIdx + 1} of {TOTAL_QUESTION_STEPS}</p>
        </div>
      )}

      <div className="flex-1">
        <AnimatePresence mode="wait">

          {/* ── Q1: CLIENT COUNT ──────────────────────────────────────────────── */}
          {step === "client_count" && (
            <motion.div key="client_count" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold leading-snug">How many clients do you serve per month?</h2>
                <p className="text-sm text-muted-foreground mt-1">Tap to select — we'll customise your experience.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CLIENT_RANGES.map(({ label, emoji }) => (
                  <button
                    key={label}
                    onClick={() => pick("clientRange", label, "challenge")}
                    className={`flex flex-col items-center justify-center gap-2 py-6 rounded-3xl border-2 font-bold text-sm transition-all active:scale-95 ${answers.clientRange === label ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25" : "bg-card border-border hover:border-primary/40"}`}
                  >
                    <span className="text-3xl">{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
              <div className="text-center pt-2">
                <button onClick={() => navigate("/account-login")} className="text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2 mx-auto">
                  <LogIn size={14} /> Already have an account? Login
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Q2: CHALLENGE ─────────────────────────────────────────────────── */}
          {step === "challenge" && (
            <motion.div key="challenge" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold leading-snug">What's your biggest challenge?</h2>
                <p className="text-sm text-muted-foreground mt-1">Select one to continue.</p>
              </div>
              <div className="space-y-3">
                {CHALLENGES.map(({ id, label, emoji }) => (
                  <button
                    key={id}
                    onClick={() => pick("challenge", id, "gender")}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 font-semibold text-sm text-left transition-all active:scale-[0.98] ${answers.challenge === id ? "bg-primary/10 border-primary text-primary" : "bg-card border-border hover:border-primary/30"}`}
                  >
                    <span className="text-2xl shrink-0">{emoji}</span>
                    <span className="flex-1">{label}</span>
                    {answers.challenge === id && <Check size={16} className="text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Q3: GENDER ────────────────────────────────────────────────────── */}
          {step === "gender" && (
            <motion.div key="gender" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold leading-snug">What is your gender?</h2>
                <p className="text-sm text-muted-foreground mt-1">Helps us personalise your templates.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(["male", "female"] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => pick("gender", g, "location")}
                    className={`flex flex-col items-center justify-center gap-3 py-10 rounded-3xl border-2 font-bold text-base capitalize transition-all active:scale-95 ${answers.gender === g ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25" : "bg-card border-border hover:border-primary/40"}`}
                  >
                    <span className="text-4xl">{g === "male" ? "👨" : "👩"}</span>
                    {g}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Q4: LOCATION ──────────────────────────────────────────────────── */}
          {step === "location" && (
            <motion.div key="location" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold leading-snug">Where are you located?</h2>
                <p className="text-sm text-muted-foreground mt-1">We already know you're in Nigeria. Just your city and state.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className={lbl}>City</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input type="text" placeholder="e.g. Lagos, Abuja, Kano..."
                      value={answers.city} onChange={e => setAnswers(a => ({ ...a, city: e.target.value }))} className={inp} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={lbl}>State</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input type="text" placeholder="e.g. Lagos State, FCT..."
                      value={answers.state} onChange={e => setAnswers(a => ({ ...a, state: e.target.value }))} className={inp} />
                  </div>
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    if (!answers.city || !answers.state) {
                      toast({ title: "Required", description: "Please enter your city and state.", variant: "destructive" }); return;
                    }
                    setStep("devices");
                  }}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-base flex items-center justify-center gap-2"
                >
                  Continue <ChevronRight size={18} />
                </button>
                <button onClick={() => setStep("gender")} className="w-full py-2 text-sm text-muted-foreground font-semibold">← Back</button>
              </div>
            </motion.div>
          )}

          {/* ── Q5: DEVICES ───────────────────────────────────────────────────── */}
          {step === "devices" && (
            <motion.div key="devices" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold leading-snug">How many devices do you want Premium on?</h2>
                <p className="text-sm text-muted-foreground mt-1">You can always upgrade later to add more devices.</p>
              </div>
              <div className="space-y-3">
                {DEVICE_OPTIONS.map(({ count, label, sub, emoji }) => (
                  <button
                    key={count}
                    onClick={() => pickDevice(count, "account")}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 font-semibold text-sm text-left transition-all active:scale-[0.98] ${selectedDeviceCount === count ? "bg-primary/10 border-primary text-primary" : "bg-card border-border hover:border-primary/30"}`}
                  >
                    <span className="text-2xl shrink-0">{emoji}</span>
                    <div className="flex-1">
                      <p className="font-bold">{label}</p>
                      <p className={`text-[11px] mt-0.5 ${selectedDeviceCount === count ? "text-primary/70" : "text-muted-foreground"}`}>{sub}</p>
                    </div>
                    {selectedDeviceCount === count && <Check size={16} className="text-primary shrink-0" />}
                    {count === 5 && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/20">BEST</span>}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep("location")} className="w-full py-2 text-sm text-muted-foreground font-semibold">← Back</button>
            </motion.div>
          )}

          {/* ── Q6: ACCOUNT CREATION ──────────────────────────────────────────── */}
          {step === "account" && (
            <motion.div key="account" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold leading-snug">Create your account</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  One account restores premium on{" "}
                  <span className="font-bold text-primary">{selectedDeviceCount} device{selectedDeviceCount !== 1 ? "s" : ""}</span>.
                </p>
              </div>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <label className={lbl}>Business / Shop Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input required type="text" placeholder="e.g. Joyful Stitches" value={answers.name}
                      onChange={e => setAnswers(a => ({ ...a, name: e.target.value }))} className={inp} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={lbl}>WhatsApp Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-green-500" size={16} />
                    <input required type="tel" placeholder="e.g. 08012345678" value={answers.phone}
                      onChange={e => setAnswers(a => ({ ...a, phone: e.target.value.replace(/[^0-9+]/g, "") }))} className={inp} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={lbl}>Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input required type="email" placeholder="you@example.com" value={answers.email}
                      onChange={e => handleEmailChange(e.target.value)}
                      className={`${inp} ${emailAvailable === false ? "border-red-500" : emailAvailable === true ? "border-emerald-500" : ""}`} />
                    {checkingEmail && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" size={14} />}
                  </div>
                  {!checkingEmail && emailAvailable === false && (
                    <p className="text-xs text-red-500 ml-1">Email taken. <button type="button" onClick={() => navigate("/account-login")} className="underline font-bold">Login instead</button></p>
                  )}
                  {!checkingEmail && emailAvailable === true && <p className="text-xs text-emerald-500 ml-1">✓ Email available</p>}
                </div>
                <div className="space-y-1.5">
                  <label className={lbl}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input required type={showPassword ? "text" : "password"} placeholder="At least 6 characters" value={answers.password}
                      onChange={e => setAnswers(a => ({ ...a, password: e.target.value }))} className={`${inp} pr-11`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={lbl}>Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input required type={showConfirmPassword ? "text" : "password"} placeholder="Repeat password" value={answers.confirmPassword}
                      onChange={e => setAnswers(a => ({ ...a, confirmPassword: e.target.value }))}
                      className={`${inp} pr-11 ${answers.confirmPassword && answers.password !== answers.confirmPassword ? "border-red-500" : ""}`} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {answers.confirmPassword && answers.password !== answers.confirmPassword && (
                    <p className="text-xs text-red-500 ml-1">Passwords don't match</p>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep("devices")} className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-2xl font-bold">Back</button>
                  <button type="submit" disabled={processing} className="flex-[2] py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                    {processing ? <Loader2 className="animate-spin" size={18} /> : <><Crown size={18} /> See Premium</>}
                  </button>
                </div>
                <div className="text-center">
                  <button type="button" onClick={() => navigate("/account-login")} className="text-sm text-muted-foreground">
                    Already have an account? <span className="text-primary font-semibold">Login</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ── VERIFICATION PENDING ──────────────────────────────────────────── */}
          {step === "pending" && (
            <motion.div key="pending" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12 space-y-6">
              <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                <RefreshCw size={48} className="text-blue-500 animate-spin" style={{ animationDuration: "3s" }} />
              </div>
              <h2 className="text-2xl font-bold">Verification Pending</h2>
              <p className="text-muted-foreground leading-relaxed">Your proof has been submitted. We'll verify and activate your premium shortly.</p>
              {account?.email && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl text-sm text-blue-700 dark:text-blue-400">
                  You'll receive a confirmation at <b>{account.email}</b> once approved.
                </div>
              )}
              <PendingNotifySupportButton account={account} />
            </motion.div>
          )}

          {/* ── PAYMENT REJECTED ──────────────────────────────────────────────── */}
          {step === "rejected_reupload" && (
            <motion.div key="rejected_reupload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex items-start gap-3 p-5 bg-red-500/10 border border-red-500/25 rounded-3xl">
                <AlertCircle size={20} className="text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-black text-red-400 uppercase tracking-wider mb-1">Payment Not Verified</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">Your previous payment could not be verified. You can retry payment — select your preferred payment method and pay again, or upload a clearer proof if you already paid.</p>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/premium-details")}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all"
                >
                  <ShieldCheck size={18} /> Retry Payment
                </button>
                <p className="text-center text-xs text-muted-foreground">
                  Select your payment method, pay, and upload your proof again.
                </p>
              </div>
              <button onClick={() => navigate("/home")} className="w-full py-3 bg-secondary text-secondary-foreground rounded-2xl font-bold text-sm">Back to Home</button>
            </motion.div>
          )}

          {/* ── SUCCESS ───────────────────────────────────────────────────────── */}
          {step === "success" && (
            <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12 space-y-6">
              <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500/20">
                <ShieldCheck size={60} className="text-emerald-500" />
              </div>
              <h2 className="text-3xl font-bold">Premium Unlocked!</h2>
              <p className="text-muted-foreground">Welcome to OneTailor Premium{account?.businessName ? `, ${account.businessName}` : ""}!</p>
              <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 rounded-3xl space-y-2">
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">✅ Premium Access: ACTIVE</p>
                <p className="text-xs text-muted-foreground">Log in on any authorised device with your email to restore premium automatically.</p>
              </div>
              <button onClick={() => navigate("/home")} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg">
                Start Using Premium Features
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
