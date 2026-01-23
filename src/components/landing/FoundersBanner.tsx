import { Mail, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const FOUNDERS_EMAIL = "hello@gatekpr.app";

export function FoundersBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-[70] bg-gradient-to-r from-primary via-primary/90 to-secondary text-primary-foreground shadow-lg"
    >
      <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles className="h-4 w-4 flex-shrink-0 animate-pulse hidden sm:block" />
          <p className="text-sm font-medium">
            {/* Mobile: concise but informative */}
            <span className="sm:hidden">
              <span className="font-semibold">Pre-launch</span> — Email us to reserve your spot
            </span>
            {/* Desktop: full message */}
            <span className="hidden sm:inline">
              <span className="font-semibold">Launching April 2026</span> — Email us to join the waitlist for early access pricing
            </span>
          </p>
        </div>
        
        <a
          href={`mailto:${FOUNDERS_EMAIL}?subject=Founders%20Waitlist%20Inquiry&body=Hi%20GateKpr%20team%2C%0A%0AI%27m%20interested%20in%20joining%20the%20Founders%20Edition%20waitlist.%20Please%20send%20me%20details%20about%20early%20access%20pricing.%0A%0AThanks!`}
          className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap flex-shrink-0"
        >
          <Mail className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{FOUNDERS_EMAIL}</span>
          <span className="sm:hidden">Email Us</span>
        </a>
      </div>
    </motion.div>
  );
}
