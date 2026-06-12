import { useState } from "react";
import { Download, MoreHorizontal } from "lucide-react";

interface ShareSheetProps {
  onDownload: () => void;
  getFile?: () => File | null | undefined | Promise<File | null | undefined>;
  filename?: string;
  shareTitle?: string;
  shareText?: string;
  compact?: boolean;
}

type ShareTarget = "whatsapp" | "facebook" | "instagram" | "email" | "sms" | "more";

const SHARE_OPTIONS: { id: ShareTarget; label: string; color: string; bg: string }[] = [
  { id: "whatsapp",   label: "WhatsApp",  color: "#25D366", bg: "rgba(37,211,102,0.12)" },
  { id: "facebook",   label: "Facebook",  color: "#1877F2", bg: "rgba(24,119,242,0.12)" },
  { id: "instagram",  label: "Instagram", color: "#E1306C", bg: "rgba(225,48,108,0.12)" },
  { id: "email",      label: "Email",     color: "#6B7280", bg: "rgba(107,114,128,0.12)" },
  { id: "sms",        label: "SMS",       color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  { id: "more",       label: "More",      color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
];

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}

function EmailIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
}

function SMSIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function getIcon(id: ShareTarget, size: number) {
  switch (id) {
    case "whatsapp":  return <WhatsAppIcon size={size} />;
    case "facebook":  return <FacebookIcon size={size} />;
    case "instagram": return <InstagramIcon size={size} />;
    case "email":     return <EmailIcon size={size} />;
    case "sms":       return <SMSIcon size={size} />;
    default:          return <MoreHorizontal size={size} />;
  }
}

export default function ShareSheet({ onDownload, getFile, filename = "image.jpg", shareTitle = "Check this out!", shareText, compact = false }: ShareSheetProps) {
  const [sharing, setSharing] = useState<ShareTarget | null>(null);

  const handleShare = async (target: ShareTarget) => {
    setSharing(target);
    try {
      const file = await getFile?.();

      if (target === "more") {
        if (file && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: shareTitle });
        } else if (navigator.share) {
          await navigator.share({ title: shareTitle, text: shareText ?? shareTitle });
        }
        return;
      }

      if (target === "whatsapp") {
        if (file && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: shareTitle });
        } else {
          const text = shareText ?? shareTitle;
          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
        }
        return;
      }

      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: shareTitle });
      } else {
        const text = shareText ?? shareTitle;
        window.open(`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(text)}`, "_blank");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSharing(null);
    }
  };

  if (compact) {
    return (
      <div className="flex gap-2">
        <button 
          onClick={onDownload}
          className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <Download size={18} /> Save To Device
        </button>
        <button 
          onClick={() => handleShare("more")}
          className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {SHARE_OPTIONS.slice(0, 5).map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleShare(opt.id)}
            disabled={sharing !== null}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
            style={{ background: opt.bg, color: opt.color }}
          >
            {sharing === opt.id ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : getIcon(opt.id, 20)}
            <span className="text-[10px] font-bold uppercase tracking-wider">{opt.label}</span>
          </button>
        ))}
        <button
          onClick={() => handleShare("more")}
          className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-muted/50 text-muted-foreground transition-all active:scale-95"
        >
          <MoreHorizontal size={20} />
          <span className="text-[10px] font-bold uppercase tracking-wider">More</span>
        </button>
      </div>

      <button 
        onClick={onDownload}
        className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
      >
        <Download size={20} /> Save To Device
      </button>
    </div>
  );
}
