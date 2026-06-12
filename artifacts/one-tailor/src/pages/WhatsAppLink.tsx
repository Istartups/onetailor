import { useState } from "react";
import { Copy, ExternalLink, Share2, Check, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { PremiumBadge } from "@/components/shared/PremiumBadge";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store/useAppStore";

const COUNTRY_CODES = [
  { label: "Nigeria", code: "234", flag: "🇳🇬" },
  { label: "Ghana", code: "233", flag: "🇬🇭" },
  { label: "Kenya", code: "254", flag: "🇰🇪" },
  { label: "South Africa", code: "27", flag: "🇿🇦" },
  { label: "UK", code: "44", flag: "🇬🇧" },
  { label: "USA", code: "1", flag: "🇺🇸" },
];

const TEMPLATES = [
  "Hello, I want to place an order",
  "I want this design",
  "How much is this outfit?",
];

export default function WhatsAppLink() {
  const isPremium = useAppStore((s) => s.isPremium);
  const incrementUsage = useAppStore((s) => s.incrementUsage);
  const addRecentTool = useAppStore((s) => s.addRecentTool);
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("234");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const cleanPhone = phone.replace(/\D/g, "").replace(/^0+/, "");
  const fullNumber = countryCode + cleanPhone;
  const encodedMessage = encodeURIComponent(message);
  const waLink = cleanPhone
    ? `https://wa.me/${fullNumber}${message ? `?text=${encodedMessage}` : ""}`
    : "";

  const isValid = cleanPhone.length >= 7 && cleanPhone.length <= 15;

  const handleCopy = async () => {
    if (!waLink) return;
    await navigator.clipboard.writeText(waLink);
    setCopied(true);
    await incrementUsage();
    addRecentTool("whatsapp-link");
    toast({ title: "Copied!", description: "WhatsApp link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!waLink) return;
    if (navigator.share) {
      await navigator.share({ title: "WhatsApp Link", url: waLink });
    } else {
      await handleCopy();
    }
  };

  const handleTest = () => {
    if (waLink) window.open(waLink, "_blank");
  };

  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader 
        title="WhatsApp Link" 
        subtitle="Let customers contact you with one tap" 
        backPath="/all-tools?cat=business"
        backLabel="Business Tools"
      />

      <div className="px-4 py-5 space-y-4">
        {/* Phone number */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Phone Number</label>
          <div className="flex gap-2">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="bg-muted/50 text-foreground text-sm font-semibold px-3 py-3 rounded-xl border border-border outline-none"
              data-testid="select-country-code"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} +{c.code}
                </option>
              ))}
            </select>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="08012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 bg-muted/50 text-foreground text-base font-medium rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary border border-border"
              data-testid="input-phone"
            />
          </div>
          {phone && !isValid && (
            <p className="text-xs text-destructive">Enter a valid phone number (7–15 digits)</p>
          )}
        </div>

        {/* Message templates */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Quick Templates</label>
          <div className="flex flex-col gap-2">
            {TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                onClick={() => setMessage(tpl)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all active:scale-[0.98] border ${
                  message === tpl
                    ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                    : "bg-muted/50 border-border text-foreground hover:bg-muted"
                }`}
                data-testid={`button-template-${i}`}
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>

        {/* Custom message */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Message (optional)
          </label>
          <textarea
            placeholder="Type a custom message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full bg-muted/50 text-foreground text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary border border-border resize-none"
            data-testid="textarea-message"
          />
          {message && (
            <button
              onClick={() => setMessage("")}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear message
            </button>
          )}
        </div>

        {/* Live WhatsApp preview */}
        {message && (
          <div className="rounded-2xl overflow-hidden border border-border">
            {/* WhatsApp header bar */}
            <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: "hsl(144,50%,25%)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(144,45%,30%)" }}>
                <MessageCircle size={16} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-none">Your Business</p>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>Message Preview</p>
              </div>
            </div>

            {/* Chat area */}
            <div className="px-3 py-4 min-h-[80px]" style={{
              background: "hsl(200,18%,14%)",
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='1' fill='rgba(255,255,255,0.02)'/%3E%3C/svg%3E\")"
            }}>
              <div className="flex justify-end">
                <div
                  className="max-w-[82%] rounded-2xl rounded-br-[4px] px-3 py-2 relative"
                  style={{ background: "hsl(144,40%,22%)" }}
                >
                  {/* Bubble tail */}
                  <div className="absolute bottom-0 right-[-7px]" style={{
                    width: 0, height: 0,
                    borderLeft: "8px solid hsl(144,40%,22%)",
                    borderBottom: "8px solid transparent",
                  }} />
                  <p className="text-sm leading-relaxed text-white whitespace-pre-wrap break-words">
                    {message}
                  </p>
                  <p className="text-right text-[10px] mt-1 select-none" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {now} ✓✓
                  </p>
                </div>
              </div>
            </div>

            <div className="px-3 py-1.5" style={{ background: "hsl(200,18%,12%)" }}>
              <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
                Preview of how your message will appear
              </p>
            </div>
          </div>
        )}

        {/* Generated link */}
        {waLink && isValid && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-green-600 dark:text-green-400" />
              <span className="text-sm font-semibold text-green-700 dark:text-green-400">Your WhatsApp Link</span>
            </div>
            <p className="text-xs text-muted-foreground break-all font-mono bg-background/50 rounded-lg px-3 py-2 border border-border">
              {waLink}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-foreground text-background text-xs font-bold rounded-xl active:scale-95 transition-transform"
                data-testid="button-copy-link"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-green-600 text-white text-xs font-bold rounded-xl active:scale-95 transition-transform"
                data-testid="button-share-link"
              >
                <Share2 size={14} />
                Share
              </button>
              <button
                onClick={handleTest}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-muted text-foreground text-xs font-bold rounded-xl border border-border active:scale-95 transition-transform"
                data-testid="button-test-link"
              >
                <ExternalLink size={14} />
                Test
              </button>
            </div>
          </div>
        )}

        {/* Premium feature teaser */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Saved Templates</span>
            <PremiumBadge />
          </div>
          <p className="text-xs text-muted-foreground">Unlock Premium to save and reuse your favourite message templates.</p>
        </div>
      </div>
    </div>
  );
}
