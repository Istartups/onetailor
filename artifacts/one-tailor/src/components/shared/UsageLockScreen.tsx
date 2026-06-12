import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Zap, Lock, ArrowRight, ShieldCheck, Database, LayoutGrid, Palette, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface UsageLockScreenProps {
  isOpen: boolean;
  onClose?: () => void;
}

const PREMIUM_FEATURES = [
  { icon: Crown, title: "Unlimited Access", desc: "No more usage limits on any tool" },
  { icon: ShieldCheck, title: "Full Client Database", desc: "Access unlimited customer measurements & history" },
  { icon: Palette, title: "Brand Identity", desc: "Professional watermarks & brand colors" },
  { icon: Database, title: "Secure Backup", desc: "Export and import your data across devices" },
];

export function UsageLockScreen({ isOpen }: UsageLockScreenProps) {
  const [, setLocation] = useLocation();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md p-6 overflow-y-auto"
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card border border-primary/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Background Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 blur-[80px] rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full" />

          <div className="relative space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 mb-2">
                <Lock className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-3xl font-black tracking-tight" style={{ fontFamily: "var(--font-serif)" }}>
                Your free uses are <span className="gold-shimmer">finished</span>
              </h2>
              <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                You've done amazing work! To keep growing your business and accessing these tools without limits, let's take the next step together.
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-4">
              {PREMIUM_FEATURES.map((feature, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{feature.title}</p>
                    <p className="text-[11px] text-muted-foreground font-medium">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="space-y-4 pt-2">
              <Button 
                onClick={() => setLocation("/pre-unlock")}
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all group"
              >
                Unlock Premium Experience
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                  <span className="bg-card px-2 text-muted-foreground">Or unlock bonus usage</span>
                </div>
              </div>

              <Button 
                onClick={() => setLocation("/invite")}
                variant="outline"
                className="w-full h-14 rounded-2xl border-primary/20 bg-primary/5 hover:bg-primary/10 font-bold text-primary transition-all"
              >
                <Users className="w-5 h-5 mr-2" />
                Invite Tailors for Bonus Credits
              </Button>
              
              <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/40">
                <ShieldCheck className="w-3 h-3" />
                Trusted by 1000+ Fashion Entrepreneurs
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
