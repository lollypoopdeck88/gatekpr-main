import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const FOUNDERS_EMAIL = "hello@gatekpr.app";
const MAILTO_HREF = `mailto:${FOUNDERS_EMAIL}?subject=Founders%20Waitlist&body=Hi%20GateKpr%20team%2C%0A%0AI%27d%20like%20to%20join%20the%20launch%20waitlist%20and%20learn%20about%20founders%20pricing.%0A%0AThanks!`;

export function FoundersBanner() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-[70] bg-secondary text-secondary-foreground"
    >
      {/* Desktop: single row, Mobile: compact two-line */}
      <div className="h-12 sm:h-10">
        <div className="container mx-auto h-full px-4 flex items-center justify-center gap-x-3 gap-y-0.5 flex-wrap sm:flex-nowrap">
          {/* Message */}
          <p className="text-xs sm:text-sm text-center sm:text-left">
            <span className="font-semibold">Launching April 2026</span>
            <span className="hidden sm:inline"> — Join the waitlist for founders pricing</span>
            <span className="sm:hidden"> • Founders pricing available</span>
          </p>

          {/* CTA */}
          <a
            href={MAILTO_HREF}
            className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 transition-colors rounded-full px-3 py-1 text-xs font-medium"
          >
            <span className="hidden sm:inline">Email {FOUNDERS_EMAIL}</span>
            <span className="sm:hidden">Join Waitlist</span>
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
