import React, { useState } from "react";
import { 
  Users, 
  Share2, 
  Copy, 
  Check, 
  Gift, 
  Zap, 
  Crown, 
  MessageCircle, 
  Trophy,
  Info,
  Loader2
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function InviteTailors() {
  const { referralCode, successfulInvites, bonusUsageLimit, referredBy, applyReferralCode } = useAppStore();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setRedeeming(true);
    try {
      const result = await applyReferralCode(redeemCode.trim().toUpperCase());
      if (result.success) {
        toast({ title: "Success!", description: "Referral code applied. Complete 1 tool action to unlock rewards for your friend!" });
        setRedeemCode("");
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    } finally {
      setRedeeming(false);
    }
  };

  const shareLink = `${window.location.origin}?ref=${referralCode}`;
  const shareMessage = `I'm using OneTailor Toolkit to manage measurements, flyers, pricing, business tools and customer records.

Try it free here:
${shareLink}

Referral Code:
${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareMessage);
    setCopied(true);
    toast({ title: "Copied!", description: "Invitation message copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join OneTailor Toolkit",
          text: shareMessage,
          url: shareLink,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      handleCopy();
    }
  };

  const card = "bg-card border border-border rounded-[2rem] p-6 shadow-sm";

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <PageHeader 
        title="Earn Credit" 
        subtitle="Grow the community & unlock rewards" 
        backPath="/all-tools"
      />

      <div className="px-4 py-5 space-y-6">
        {/* Referral Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className={card + " flex flex-col items-center justify-center text-center py-8"}>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Successful Invites</p>
            <p className="text-3xl font-black mt-1">{successfulInvites}</p>
          </div>
          <div className={card + " flex flex-col items-center justify-center text-center py-8"}>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-3">
              <Zap className="w-6 h-6 text-amber-500" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bonus Credits</p>
            <p className="text-3xl font-black mt-1">+{bonusUsageLimit}</p>
          </div>
        </div>

        {/* Share Section */}
        <div className={card + " space-y-6 relative overflow-hidden"}>
          <div className="absolute top-0 right-0 p-8 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          
          <div className="relative space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold">Share your link</h3>
              <p className="text-sm text-muted-foreground font-medium">
                When a tailor uses your code and completes their first tool action, you both grow!
              </p>
            </div>

            <div className="bg-muted/30 rounded-2xl p-4 border border-border flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">Your Referral Code</p>
                <p className="text-lg font-black tracking-widest truncate">{referralCode || "Loading..."}</p>
              </div>
              <Button 
                onClick={handleCopy}
                variant="outline"
                className="rounded-xl h-12 px-5 border-primary/20 bg-primary/5 hover:bg-primary/10"
              >
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-primary" />}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2">
              <Button 
                onClick={handleWhatsAppShare}
                className="w-full h-14 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-lg shadow-lg shadow-[#25D366]/20"
              >
                <MessageCircle className="w-6 h-6 mr-2" />
                Invite on WhatsApp
              </Button>
              <Button 
                onClick={handleNativeShare}
                variant="secondary"
                className="w-full h-14 rounded-2xl font-bold text-lg"
              >
                <Share2 className="w-5 h-5 mr-2" />
                Share Invite Link
              </Button>
            </div>
          </div>
        </div>

        {/* Reward Levels */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Community Rewards</h3>
          </div>

          <div className="space-y-3">
            <RewardItem 
              invites={1} 
              title="Kickstart Bonus" 
              reward="+5 Bonus Credits" 
              active={successfulInvites >= 1} 
              icon={<Zap className="w-5 h-5" />}
              current={successfulInvites}
            />
            <RewardItem 
              invites={3} 
              title="Tailor Pro" 
              reward="7 Days Premium Access" 
              active={successfulInvites >= 3} 
              icon={<Crown className="w-5 h-5" />}
              current={successfulInvites}
            />
            <RewardItem 
              invites={10} 
              title="Community Ambassador" 
              reward="30 Days Premium Access" 
              active={successfulInvites >= 10} 
              icon={<Gift className="w-5 h-5" />}
              current={successfulInvites}
            />
          </div>
        </div>

        {/* How it works */}
        <div className="bg-primary/5 border border-primary/10 rounded-[2rem] p-6 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-sm">How do invites count?</p>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
              An invite is successful when the tailor you invited installs OneTailor, enters your code, and successfully completes their first tool action.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RewardItem({ invites, title, reward, active, icon, current }: { invites: number, title: string, reward: string, active: boolean, icon: React.ReactNode, current: number }) {
  return (
    <div className={`flex items-center gap-4 p-5 rounded-[1.5rem] border transition-all ${active ? "bg-primary/10 border-primary/30" : "bg-card border-border opacity-60"}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-black text-sm">{title}</p>
          {active && <Check className="w-4 h-4 text-primary" />}
        </div>
        <p className="text-xs font-bold text-primary/80">{reward}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{active ? "Unlocked" : "Progress"}</p>
        <p className="text-sm font-black">{Math.min(current, invites)}/{invites}</p>
      </div>
    </div>
  );
}
