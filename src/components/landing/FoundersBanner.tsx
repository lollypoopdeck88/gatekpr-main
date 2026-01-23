import { Mail, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function FoundersBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-gradient-to-r from-secondary/90 to-secondary text-white py-4 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 flex-shrink-0" />
          <span className="font-semibold">Founders Edition</span>
        </div>
        
        <span className="hidden sm:inline text-white/60">•</span>
        
        <p className="text-sm sm:text-base text-white/90">
          Launching in <strong>April 2026</strong> — Early access with first-year discount!
        </p>
        
        <span className="hidden sm:inline text-white/60">•</span>
        
        <a
          href="mailto:hello@gatekpr.app?subject=Founders%20List%20Request"
          className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors rounded-full px-4 py-1.5 text-sm font-medium"
        >
          <Mail className="h-4 w-4" />
          Join the Founders List
        </a>
      </div>
    </motion.div>
  );
}
