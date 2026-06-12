import React from "react";
import { AlertCircle, Zap, Crown } from "lucide-react";
import { useUsageLimit } from "../../hooks/use-usage-limit";
import { motion, AnimatePresence } from "framer-motion";

export function UsageWarning() {
  const { isPremium, isNearLimit, remaining } = useUsageLimit();

  if (isPremium || !isNearLimit || remaining <= 0) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        className="px-4 py-3 bg-primary/10 border-b border-primary/20 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-primary/80 uppercase tracking-wider">Usage Warning</p>
            <p className="text-xs font-medium text-foreground truncate">
              You have <span className="text-primary font-bold">{remaining}</span> free tool actions remaining.
            </p>
          </div>
        </div>
        <button 
          onClick={() => window.location.hash = "/pre-unlock"}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider shadow-sm active:scale-95 transition-all"
        >
          <Crown className="w-3 h-3" />
          Upgrade
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
