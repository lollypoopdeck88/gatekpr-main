import { useState } from "react";
import { Mail, Sparkles, Check, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const FOUNDERS_EMAIL = "hello@gatekpr.app";

export function FoundersBanner() {
  const [copied, setCopied] = useState(false);

  const handleEmailClick = async () => {
    // Try mailto first
    const mailtoLink = `mailto:${FOUNDERS_EMAIL}?subject=Founders%20List%20Request`;
    const mailWindow = window.open(mailtoLink, "_self");
    
    // Fallback: copy email to clipboard
    setTimeout(async () => {
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
    }, 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-secondary/90 to-secondary text-white py-3 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 flex-shrink-0" />
          <span className="font-semibold">Founders Edition</span>
        </div>
        
        <span className="hidden sm:inline text-white/60">•</span>
        
        <p className="text-sm sm:text-base text-white/90">
          Launching <strong>April 2026</strong> — Early access + first-year discount!
        </p>
        
        <span className="hidden sm:inline text-white/60">•</span>
        
        <button
          onClick={handleEmailClick}
          className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors rounded-full px-4 py-1.5 text-sm font-medium cursor-pointer"
        >
          {copied ? <Check className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
          {copied ? "Email Copied!" : "Join the Founders List"}
        </button>
      </div>
    </motion.div>
  );
}
