import { motion } from "framer-motion";

const FOUNDERS_EMAIL = "hello@gatekpr.app";

const MAILTO_HREF = `mailto:${FOUNDERS_EMAIL}?subject=Launch%20Waitlist%20%2B%20Founders%20Pricing&body=Hi%20GateKpr%20team%2C%0A%0AI%27d%20like%20to%20join%20the%20launch%20waitlist%20and%20lock%20in%20founders%20pricing.%0A%0APlease%20share%20availability%2C%20pricing%2C%20and%20next%20steps.%0A%0AThanks!`;

export function FoundersBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-[70] bg-gradient-to-r from-primary via-primary/90 to-secondary text-primary-foreground shadow-lg"
      role="region"
      aria-label="Launch waitlist banner"
    >
      {/* Fixed height so the navbar offset is deterministic */}
      <div className="h-16 sm:h-12">
        <div className="container mx-auto h-full px-4 flex items-center justify-center">
          <p className="text-xs sm:text-sm font-medium leading-tight sm:leading-normal text-center">
            <span className="hidden sm:inline">
              GateKpr begins launching April 2026. Email us at{" "}
              <a
                href={MAILTO_HREF}
                className="underline underline-offset-2 font-semibold hover:opacity-90 transition-opacity"
              >
                {FOUNDERS_EMAIL}
              </a>
              {" "}to join the launch waitlist and lock in founders pricing.
            </span>

            <span className="sm:hidden">
              GateKpr launches April 2026 • Email{" "}
              <a
                href={MAILTO_HREF}
                className="underline underline-offset-2 font-semibold hover:opacity-90 transition-opacity"
              >
                {FOUNDERS_EMAIL}
              </a>
              {" "}to join the waitlist & lock in founders pricing.
            </span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
