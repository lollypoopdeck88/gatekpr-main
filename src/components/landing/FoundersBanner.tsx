import { motion } from "framer-motion";

const FOUNDERS_EMAIL = "hello@gatekpr.app";
const MAILTO_HREF = `mailto:${FOUNDERS_EMAIL}?subject=Founders%20Waitlist&body=Hi%20GateKpr%20team%2C%0A%0AI%27d%20like%20to%20join%20the%20launch%20waitlist%20and%20learn%20about%20founders%20pricing.%0A%0AThanks!`;

export function FoundersBanner() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-[70] bg-gradient-to-r from-primary to-secondary text-white shadow-md"
    >
      <div className="h-11 sm:h-10">
        <div className="container mx-auto h-full px-4 flex items-center justify-center gap-2 sm:gap-4">
          {/* Message */}
          <p className="text-xs sm:text-sm font-medium text-center">
            <span className="hidden sm:inline">
              <span className="font-semibold">Launching April 2026</span>
              <span className="mx-2 opacity-60">•</span>
              Join the waitlist for early access and discounts
            </span>
            <span className="sm:hidden">
              <span className="font-semibold">Launching April 2026</span>
              <span className="mx-1.5 opacity-60">•</span>
              Get early access
            </span>
          </p>

          {/* CTA with glow animation */}
          <a
            href={MAILTO_HREF}
            className="relative inline-flex items-center gap-1.5 bg-white text-primary hover:bg-white/90 transition-all rounded-full px-3 py-1 text-xs font-semibold shadow-[0_0_12px_rgba(255,255,255,0.4)] hover:shadow-[0_0_20px_rgba(255,255,255,0.6)] animate-[pulse-glow_2s_ease-in-out_infinite]"
          >
            <span className="hidden sm:inline">Email Us</span>
            <span className="sm:hidden">Join</span>
          </a>
        </div>
      </div>

      {/* Custom keyframe for subtle glow pulse */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 12px rgba(255,255,255,0.4); }
          50% { box-shadow: 0 0 20px rgba(255,255,255,0.7); }
        }
      `}</style>
    </motion.div>
  );
}
