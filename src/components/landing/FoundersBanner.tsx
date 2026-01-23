import { useState, useEffect } from "react";
import { Mail, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FOUNDERS_EMAIL = "hello@gatekpr.app";
const STORAGE_KEY = "gatekpr_founders_banner_dismissed";

export function FoundersBanner() {
  const [dismissed, setDismissed] = useState(true); // Start hidden to prevent flash

  useEffect(() => {
    const wasDismissed = localStorage.getItem(STORAGE_KEY);
    setDismissed(wasDismissed === "true");
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const handleEmailClick = () => {
    // Use window.location.href for mailto - works reliably on mobile
    window.location.href = `mailto:${FOUNDERS_EMAIL}?subject=Join%20the%20Founders%20List&body=Hi%20GateKpr%20team%2C%0A%0AI%27d%20like%20to%20join%20the%20Founders%20Edition%20waitlist!`;
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-0 left-0 right-0 z-[70] bg-gradient-to-r from-primary via-primary/90 to-secondary text-primary-foreground shadow-lg"
        >
          <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Sparkles className="h-4 w-4 flex-shrink-0 animate-pulse hidden sm:block" />
              <p className="text-sm font-medium">
                {/* Mobile: concise but informative */}
                <span className="sm:hidden">
                  <span className="font-semibold">Pre-launch</span> — Limited founder spots available
                </span>
                {/* Desktop: full message */}
                <span className="hidden sm:inline">
                  <span className="font-semibold">Founders Edition</span> — Launching April 2026. Limited spots with early access pricing!
                </span>
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleEmailClick}
                className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              >
                <Mail className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Inquire Now</span>
                <span className="sm:hidden">Get Pricing</span>
              </button>
              
              <button
                onClick={handleDismiss}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
