import { AlertTriangle, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface SpoofBannerProps {
  spoofedUser: {
    name: string;
    email: string;
  };
  onExit: () => void;
}

export function SpoofBanner({ spoofedUser, onExit }: SpoofBannerProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground"
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-destructive-foreground/20 px-3 py-1 rounded-full">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Danger Zone</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="text-sm">
                Viewing as <strong>{spoofedUser.name}</strong> ({spoofedUser.email})
              </span>
            </div>
            <span className="sm:hidden text-sm font-medium">
              Spoofing: {spoofedUser.name}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onExit}
            className="bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90"
          >
            <X className="h-4 w-4 mr-1" />
            Exit Spoof
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
