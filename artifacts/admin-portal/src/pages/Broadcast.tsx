import React, { useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Loader2, 
  Bell, 
  Smartphone, 
  Monitor, 
  Info,
  ExternalLink,
  Image as ImageIcon
} from "lucide-react";

export default function Broadcast() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [promoImage, setPromoImage] = useState("");
  const [contentImage, setContentImage] = useState("");
  const [sending, setSending] = useState(false);
  const promoImageRef = React.useRef<HTMLInputElement>(null);
  const contentImageRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    setSending(true);
    try {
      const res = await authFetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, url, ctaText: ctaText || null, ctaUrl: ctaUrl || null, promoImage: promoImage || null, contentImage: contentImage || null }),
      });

      const data = await res.json();
      if (res.ok) {
        toast({ title: "Broadcast Sent", description: data.message });
        setTitle("");
        setBody("");
        setUrl("/");
        setCtaText("");
        setCtaUrl("");
        setPromoImage("");
        setContentImage("");
      } else {
        toast({ variant: "destructive", title: "Failed", description: data.message });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Could not send broadcast" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white">Push Notifications</h1>
        <p className="text-muted-foreground text-sm">Send "WhatsApp-style" notifications to all devices that have allowed notifications.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="rounded-3xl border-none shadow-2xl bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="text-primary" size={20} />
                New Broadcast
              </CardTitle>
              <CardDescription>Compose your message below. It will be delivered to mobile and PC devices.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-primary/60 px-1">Notification Title</label>
                  <Input 
                    required
                    placeholder="e.g. New Feature Update!" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-12 rounded-xl bg-muted/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-primary/60 px-1">Message Body</label>
                  <Textarea 
                    required
                    placeholder="Enter your notification message here..." 
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="rounded-xl bg-muted/20 min-h-[120px] resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-primary/60 px-1">Redirect URL (Optional)</label>
                  <Input 
                    placeholder="e.g. /pre-unlock or https://example.com" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="h-12 rounded-xl bg-muted/20"
                  />
                </div>
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Images (Optional)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground px-1">Promo Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        ref={promoImageRef}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => setPromoImage(reader.result as string);
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                        id="promo-img-input"
                      />
                      <label htmlFor="promo-img-input" className="flex items-center gap-2 h-11 px-3 rounded-xl bg-muted/20 border border-border cursor-pointer hover:bg-muted/30 transition-colors text-sm text-muted-foreground">
                        <ImageIcon size={14} />
                        {promoImage ? "Image selected ✓" : "Upload promo image"}
                      </label>
                      {promoImage && (
                        <div className="relative">
                          <img src={promoImage} alt="promo" className="w-full h-20 object-cover rounded-xl" />
                          <button type="button" onClick={() => { setPromoImage(""); if (promoImageRef.current) promoImageRef.current.value = ""; }}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white text-xs">✕</button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground px-1">Content Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        ref={contentImageRef}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => setContentImage(reader.result as string);
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                        id="content-img-input"
                      />
                      <label htmlFor="content-img-input" className="flex items-center gap-2 h-11 px-3 rounded-xl bg-muted/20 border border-border cursor-pointer hover:bg-muted/30 transition-colors text-sm text-muted-foreground">
                        <ImageIcon size={14} />
                        {contentImage ? "Image selected ✓" : "Upload content image"}
                      </label>
                      {contentImage && (
                        <div className="relative">
                          <img src={contentImage} alt="content" className="w-full h-20 object-cover rounded-xl" />
                          <button type="button" onClick={() => { setContentImage(""); if (contentImageRef.current) contentImageRef.current.value = ""; }}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white text-xs">✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Images are embedded in the notification for richer delivery.</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Call-to-Action Button (Optional)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground px-1">Button Label</label>
                      <Input
                        placeholder="e.g. Upgrade Now"
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        className="h-11 rounded-xl bg-muted/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground px-1">Button URL</label>
                      <Input
                        placeholder="e.g. /pre-unlock"
                        value={ctaUrl}
                        onChange={(e) => setCtaUrl(e.target.value)}
                        className="h-11 rounded-xl bg-muted/20"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Adds an action button users can tap directly from the notification.</p>
                </div>
                <Button 
                  type="submit" 
                  disabled={sending || !title || !body} 
                  className="w-full h-14 rounded-2xl font-bold text-lg gap-2 mt-4"
                >
                  {sending ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                  Send Broadcast Now
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-3xl border-none shadow-2xl bg-card">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Info size={16} className="text-primary" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 shadow-inner">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <ImageIcon size={20} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-white truncate">{title || "Notification Title"}</p>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{body || "Your message will appear here. Keep it concise for better readability."}</p>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center italic">This is how it will look on most devices.</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-2xl bg-card">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Smartphone className="text-primary shrink-0" size={20} />
                <div className="space-y-1">
                  <p className="text-sm font-bold">Mobile Delivery</p>
                  <p className="text-xs text-muted-foreground">Works on Android and iOS (PWA must be added to home screen on iOS).</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Monitor className="text-primary shrink-0" size={20} />
                <div className="space-y-1">
                  <p className="text-sm font-bold">PC Delivery</p>
                  <p className="text-xs text-muted-foreground">Works on Chrome, Edge, and Safari even if the browser is closed.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
