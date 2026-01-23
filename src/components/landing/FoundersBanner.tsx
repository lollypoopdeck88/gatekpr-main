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
      <div className="container mx-auto px-4 py-3 text-center">
        <p className="text-sm font-medium leading-relaxed">
          {/* Mobile: stacked layout */}
          <span className="sm:hidden">
            <span className="font-semibold">GateKpr launches April 2026</span>
            <br />
            <a
              href={`mailto:${FOUNDERS_EMAIL}?subject=Founders%20Waitlist&body=Hi%20GateKpr%20team%2C%0A%0AI%27d%20like%20to%20join%20the%20launch%20waitlist%20and%20learn%20about%20founders%20pricing.%0A%0AThanks!`}
              className="underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              Email us
            </a>
            {" "}to join the waitlist & lock in founders pricing
          </span>
          {/* Desktop: single line */}
          <span className="hidden sm:inline">
            <span className="font-semibold">GateKpr begins launching April 2026</span>
            {" — "}
            Email us at{" "}
            <a
              href={`mailto:${FOUNDERS_EMAIL}?subject=Founders%20Waitlist&body=Hi%20GateKpr%20team%2C%0A%0AI%27d%20like%20to%20join%20the%20launch%20waitlist%20and%20learn%20about%20founders%20pricing.%0A%0AThanks!`}
              className="underline underline-offset-2 font-semibold hover:opacity-80 transition-opacity"
            >
              {FOUNDERS_EMAIL}
            </a>
            {" "}to join the launch waitlist and lock in founders pricing.
          </span>
        </p>
      </div>
    </motion.div>
  );
}
