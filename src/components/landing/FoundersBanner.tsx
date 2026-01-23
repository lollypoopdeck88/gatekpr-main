import { useState, useEffect } from "react";
import { Mail, Sparkles, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const FOUNDERS_EMAIL = "hello@gatekpr.app";
const STORAGE_KEY = "gatekpr_founders_banner_dismissed";

export function FoundersBanner() {
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(true); // Start hidden to prevent flash

  useEffect(() => {
    const wasDismissed = localStorage.getItem(STORAGE_KEY);
    setDismissed(wasDismissed === "true");
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const handleEmailClick = async () => {
    try {
      await navigator.clipboard.writeText(FOUNDERS_EMAIL);
      setCopied(true);
      toast.success("Email copied to clipboard!", {
        description: `Send us an email at ${FOUNDERS_EMAIL} to join the founders list.`,
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.info(`Email us at ${FOUNDERS_EMAIL}`, {
        description: "Join the founders list for early access with a first-year discount.",
      });
    }
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-lg z-[60] bg-gradient-to-r from-secondary to-secondary/90 text-white rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="p-4 sm:p-5">
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="flex items-start gap-3 pr-6">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base mb-1">Founders Edition — April 2026</h3>
                <p className="text-sm text-white/85 mb-3">
                  Get early access with a first-year discount. We're onboarding in groups—join the list!
                </p>
                
                <button
                  onClick={handleEmailClick}
                  className="inline-flex items-center gap-2 bg-white text-secondary hover:bg-white/90 transition-colors rounded-lg px-4 py-2 text-sm font-semibold"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                  {copied ? "Email Copied!" : "Join the Founders List"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
