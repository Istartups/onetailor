import { useState, useEffect, useRef } from "react";
import {
  CreditCard, Banknote, ArrowLeft, Loader2, Copy, Upload, X,
  ExternalLink, Check, ShieldCheck, Smartphone
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getDeviceId } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PaymentSettings {
  price: number;
  price2Device?: number;
  price3Device?: number;
  price5Device?: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  instructions: string;
  isPaystackEnabled: boolean;
  isManualEnabled: boolean;
  paystackPublicKey?: string;
  currencyCode?: string;
  currencySymbol?: string;
}

type Screen = "select" | "paystack_confirm" | "manual";

export default function PaymentMethod() {
  const account                  = useAppStore((s) => s.account);
  const isPremium                = useAppStore((s) => s.isPremium);
  const selectedDeviceCount      = useAppStore((s) => s.selectedDeviceCount);
  const setPendingPremiumRequest = useAppStore((s) => s.setPendingPremiumRequest);

  const { toast }    = useToast();
  const [, navigate] = useLocation();

  const [settings, setSettings]     = useState<PaymentSettings | null>(null);
  const [loading, setLoading]       = useState(true);
  const [processing, setProcessing] = useState(false);
  const [screen, setScreen]         = useState<Screen>("select");

  const [evidence, setEvidence]               = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isPremium) { navigate("/premium-activated"); return; }
    if (!account) { navigate("/pre-unlock"); return; }
    fetch("/api/payment-info")
      .then(r => r.json())
      .then(d => setSettings(d))
      .catch(() => toast({ title: "Error", description: "Could not load payment info.", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [isPremium, account]);

  const priceForCount = (count: number): number => {
    if (!settings) return 0;
    if (count === 2) return settings.price2Device || settings.price;
    if (count === 3) return settings.price3Device || settings.price;
    if (count === 5) return settings.price5Device || settings.price;
    return settings.price;
  };

  const effectivePrice = priceForCount(selectedDeviceCount);

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: settings?.currencyCode || "NGN" })
      .format(p)
      .replace(settings?.currencyCode || "NGN", settings?.currencySymbol || "₦");

  const handlePaystackInit = async () => {
    setProcessing(true);
    try {
      const res  = await fetch("/api/payment/paystack/initialize", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId:    account?.deviceId || getDeviceId(),
          email:       account?.email,
          amount:      effectivePrice,
          deviceCount: selectedDeviceCount,
        }),
      });
      const data = await res.json();
      if (data.status && data.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      } else {
        throw new Error("Init failed");
      }
    } catch {
      toast({ title: "Payment Error", description: "Could not start Paystack. Try again.", variant: "destructive" });
    } finally { setProcessing(false); }
  };

  const handleManualSubmit = async () => {
    if (!evidence) return;
    setProcessing(true);
    try {
      const fd = new FormData();
      fd.append("deviceId",    account?.deviceId || getDeviceId());
      fd.append("evidence",    evidence);
      fd.append("amount",      effectivePrice.toString());
      fd.append("deviceCount", selectedDeviceCount.toString());
      const res = await fetch("/api/payment/manual", { method: "POST", body: fd });
      if (res.ok) {
        setPendingPremiumRequest(true);
        navigate("/pre-unlock");
        toast({ title: "Submitted!", description: "We'll verify your payment shortly." });
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.message || "Failed to submit.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Try again.", variant: "destructive" });
    } finally { setProcessing(false); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 pb-24 pt-6">
      <AnimatePresence mode="wait">

        {/* ── METHOD SELECTION ──────────────────────────────────────────────── */}
        {screen === "select" && (
          <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Choose Payment Method</h2>
              <p className="text-sm text-muted-foreground">Select how you'd like to pay for premium access.</p>
            </div>

            <div className="p-3 bg-primary/5 border border-primary/15 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <Check size={14} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{account?.email}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Smartphone size={10} />
                  {selectedDeviceCount} device{selectedDeviceCount !== 1 ? "s" : ""} — lifetime premium
                </p>
              </div>
              <div className="ml-auto text-right shrink-0">
                <p className="text-sm font-black text-primary">{formatPrice(effectivePrice)}</p>
                <p className="text-[10px] text-muted-foreground">one-time</p>
              </div>
            </div>

            <div className="space-y-3">
              {settings?.isPaystackEnabled && (
                <button
                  onClick={() => setScreen("paystack_confirm")}
                  className="w-full p-6 bg-card border-2 border-border rounded-3xl flex items-center gap-4 hover:border-emerald-500/50 transition-all active:scale-[0.98] group"
                >
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                    <CreditCard size={28} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-lg">Pay with Paystack</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Card · Bank Transfer · USSD — verified instantly</p>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 group-hover:border-emerald-500 transition-colors flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              )}
              {settings?.isManualEnabled && (
                <button
                  onClick={() => setScreen("manual")}
                  className="w-full p-6 bg-card border-2 border-border rounded-3xl flex items-center gap-4 hover:border-blue-500/50 transition-all active:scale-[0.98] group"
                >
                  <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 shrink-0 group-hover:bg-blue-500/20 transition-colors">
                    <Banknote size={28} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-lg">Manual Bank Transfer</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Transfer to our account and upload your receipt</p>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 group-hover:border-blue-500 transition-colors flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              )}
            </div>

            <button onClick={() => navigate("/premium-details")} className="w-full py-3 text-sm text-muted-foreground font-semibold flex items-center justify-center gap-2">
              <ArrowLeft size={14} /> Back to Premium Details
            </button>
          </motion.div>
        )}

        {/* ── PAYSTACK CONFIRM ──────────────────────────────────────────────── */}
        {screen === "paystack_confirm" && (
          <motion.div key="paystack_confirm" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 text-center pt-6">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto">
              <ShieldCheck size={40} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Secure Checkout</h2>
              <p className="text-sm text-muted-foreground mt-1">You'll be redirected to Paystack's secure payment page.</p>
            </div>
            <div className="p-5 bg-muted/30 rounded-2xl text-left space-y-3">
              {[
                { label: "Amount",   value: formatPrice(effectivePrice) },
                { label: "Devices",  value: `${selectedDeviceCount} device${selectedDeviceCount !== 1 ? "s" : ""}` },
                { label: "Email",    value: account?.email || "" },
                { label: "Product",  value: "OneTailor Premium (Lifetime)" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-bold text-right max-w-[60%] truncate">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setScreen("select")} className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-2xl font-bold flex items-center justify-center gap-2">
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={handlePaystackInit}
                disabled={processing}
                className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 disabled:opacity-50"
              >
                {processing ? <Loader2 className="animate-spin" size={18} /> : <>Pay Now <ExternalLink size={18} /></>}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── MANUAL TRANSFER ───────────────────────────────────────────────── */}
        {screen === "manual" && (
          <motion.div key="manual" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold">Manual Bank Transfer</h2>
              <p className="text-sm text-muted-foreground mt-1">Transfer the exact amount and upload your receipt below.</p>
            </div>

            <div className="p-5 bg-primary/5 border border-primary/20 rounded-3xl space-y-4">
              <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 text-center space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Transfer Exactly</p>
                <p className="text-4xl font-black text-primary">{formatPrice(effectivePrice)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {selectedDeviceCount} device{selectedDeviceCount !== 1 ? "s" : ""} — lifetime access
                </p>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Bank Name",      value: settings?.bankName || "" },
                  { label: "Account Number", value: settings?.accountNumber || "" },
                  { label: "Account Name",   value: settings?.accountName || "" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center p-3.5 bg-card rounded-xl border border-border">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{label}</p>
                      <p className="font-bold text-sm mt-0.5">{value || "—"}</p>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(value); toast({ title: "Copied!" }); }}
                      className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
                    >
                      <Copy size={15} className="text-primary" />
                    </button>
                  </div>
                ))}
              </div>
              {settings?.instructions && (
                <p className="text-xs text-muted-foreground leading-relaxed italic">{settings.instructions}</p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-bold">Upload Your Receipt / Screenshot</p>
              {!evidencePreview ? (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="h-44 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer bg-card hover:bg-muted/50 transition-all active:scale-[0.99]"
                >
                  <Upload className="text-muted-foreground" size={24} />
                  <p className="text-sm font-medium text-muted-foreground">Tap to upload proof of payment</p>
                  <p className="text-xs text-muted-foreground/60">JPG, PNG or PDF accepted</p>
                  <input
                    ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) { setEvidence(f); setEvidencePreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : "pdf"); }
                    }}
                  />
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-border bg-card">
                  {evidencePreview === "pdf"
                    ? <div className="h-44 flex items-center justify-center text-sm font-bold">📄 PDF Selected ✓</div>
                    : <img src={evidencePreview} className="w-full h-44 object-cover" alt="Evidence" />}
                  <button
                    onClick={() => { setEvidence(null); setEvidencePreview(null); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setScreen("select")} className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-2xl font-bold flex items-center justify-center gap-2">
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={handleManualSubmit}
                disabled={processing || !evidence}
                className="flex-[2] py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? <Loader2 className="animate-spin" size={18} /> : "Submit Proof"}
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
