import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Sparkles, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Confetti } from './Confetti';

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

const DEFAULT_WELCOME_MESSAGE = `Welcome to our community portal! Here you can pay dues, submit maintenance requests, reserve community spaces, and stay updated with announcements. We're here to make community living easier for everyone.`;

export function OnboardingTour() {
  const { profile, effectiveHoaId } = useAuth();
  const {
    steps,
    currentStep,
    currentStepData,
    isActive,
    showCelebration,
    totalSteps,
    nextStep,
    prevStep,
    skipOnboarding,
    onCelebrationComplete,
  } = useOnboarding();
  
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Fetch custom welcome message from HOA settings
  const { data: hoaData } = useQuery({
    queryKey: ['hoa-welcome', effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hoas')
        .select('name, welcome_message')
        .eq('id', effectiveHoaId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveHoaId,
  });

  const welcomeMessage = hoaData?.welcome_message || DEFAULT_WELCOME_MESSAGE;
  const hoaName = hoaData?.name || 'your community';

  // Show welcome modal on first step
  useEffect(() => {
    if (isActive && currentStep === 0) {
      setShowWelcome(true);
    }
  }, [isActive, currentStep]);

  // Show completion modal when celebration triggers
  useEffect(() => {
    if (showCelebration) {
      setShowCompletionModal(true);
    }
  }, [showCelebration]);

  // Calculate tooltip position based on target element
  useEffect(() => {
    if (!isActive || showWelcome) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const target = document.querySelector(currentStepData.target);
      if (!target) {
        setPosition({
          top: window.innerHeight / 2,
          left: window.innerWidth / 2,
          arrowPosition: 'top',
        });
        return;
      }

      const rect = target.getBoundingClientRect();
      const tooltipWidth = 320;
      const tooltipHeight = 180;
      const padding = 16;

      let top: number;
      let left: number;
      let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';

      const placement = currentStepData.placement || 'bottom';

      switch (placement) {
        case 'bottom':
          top = rect.bottom + padding;
          left = Math.max(padding, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding));
          arrowPosition = 'top';
          break;
        case 'top':
          top = rect.top - tooltipHeight - padding;
          left = Math.max(padding, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding));
          arrowPosition = 'bottom';
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - padding;
          arrowPosition = 'right';
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + padding;
          arrowPosition = 'left';
          break;
        default:
          top = rect.bottom + padding;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
      }

      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));

      setPosition({ top, left, arrowPosition });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isActive, currentStep, currentStepData, showWelcome]);

  const handleStartTour = () => {
    setShowWelcome(false);
    nextStep();
  };

  const handleCloseCompletion = () => {
    setShowCompletionModal(false);
    onCelebrationComplete();
  };

  return (
    <>
      {/* Confetti celebration */}
      <Confetti trigger={showCelebration} />

      {/* Completion celebration modal */}
      <AnimatePresence>
        {showCompletionModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[100]"
              onClick={handleCloseCompletion}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            >
              <div className="bg-card rounded-xl shadow-2xl max-w-md w-full p-6 relative border border-border text-center">
                <div className="w-20 h-20 mx-auto bg-accent/20 rounded-full flex items-center justify-center mb-4">
                  <PartyPopper className="h-10 w-10 text-accent" />
                </div>
                
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  You're All Set! 🎉
                </h2>
                <p className="text-muted-foreground mb-6">
                  Welcome to {hoaName}! You're now ready to explore all the features. 
                  If you ever need a refresher, you can restart the tour from your profile.
                </p>

                <Button onClick={handleCloseCompletion} className="w-full">
                  Get Started
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {!isActive && !showCompletionModal && null}

      {isActive && (
        <>
          {/* Backdrop overlay */}
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[100]"
              onClick={skipOnboarding}
            />
          </AnimatePresence>

          {/* Welcome Modal */}
          <AnimatePresence>
            {showWelcome && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-0 z-[101] flex items-center justify-center p-4"
              >
                <div className="bg-card rounded-xl shadow-2xl max-w-md w-full p-6 relative border border-border">
                  <button
                    onClick={skipOnboarding}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-secondary/20 rounded-full flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-secondary" />
                    </div>
                    
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        Welcome to GateKpr! 🏠
                      </h2>
                      <p className="text-muted-foreground mt-2">
                        Hi{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}! We're excited to have you in {hoaName}.
                      </p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 text-left">
                      <h3 className="font-semibold text-sm text-foreground mb-2">
                        📢 Message from your HOA
                      </h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {welcomeMessage}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <Button onClick={handleStartTour} className="w-full">
                        Take a Quick Tour
                      </Button>
                      <Button variant="ghost" onClick={skipOnboarding} className="w-full text-muted-foreground">
                        Skip for now
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tour Tooltip */}
          <AnimatePresence>
            {!showWelcome && position && (
              <motion.div
                ref={tooltipRef}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{
                  position: 'fixed',
                  top: position.top,
                  left: position.left,
                  zIndex: 102,
                }}
                className="w-80"
              >
                <div className="bg-card rounded-xl shadow-2xl border border-border p-4 relative">
                  <div
                    className={`absolute w-3 h-3 bg-card border-border rotate-45 ${
                      position.arrowPosition === 'top'
                        ? '-top-1.5 left-1/2 -translate-x-1/2 border-t border-l'
                        : position.arrowPosition === 'bottom'
                        ? '-bottom-1.5 left-1/2 -translate-x-1/2 border-b border-r'
                        : position.arrowPosition === 'left'
                        ? '-left-1.5 top-1/2 -translate-y-1/2 border-t border-l'
                        : '-right-1.5 top-1/2 -translate-y-1/2 border-b border-r'
                    }`}
                  />
                  
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground">
                        {currentStepData.title}
                      </h3>
                      <button
                        onClick={skipOnboarding}
                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {currentStepData.description}
                    </p>

                    <div className="flex items-center justify-center gap-1.5 py-1">
                      {steps.slice(1).map((_, index) => (
                        <div
                          key={index}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentStep - 1
                              ? 'bg-secondary'
                              : index < currentStep - 1
                              ? 'bg-secondary/50'
                              : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={prevStep}
                        disabled={currentStep <= 1}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                      </Button>
                      
                      <span className="text-xs text-muted-foreground">
                        {currentStep} of {totalSteps - 1}
                      </span>
                      
                      <Button
                        size="sm"
                        onClick={nextStep}
                        className="gap-1"
                      >
                        {currentStep === totalSteps - 1 ? 'Finish' : 'Next'}
                        {currentStep < totalSteps - 1 && <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Highlight current target */}
          <AnimatePresence>
            {!showWelcome && (
              <HighlightTarget selector={currentStepData.target} />
            )}
          </AnimatePresence>
        </>
      )}
    </>
  );
}

function HighlightTarget({ selector }: { selector: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const target = document.querySelector(selector);
    if (target) {
      const updateRect = () => setRect(target.getBoundingClientRect());
      updateRect();
      window.addEventListener('resize', updateRect);
      window.addEventListener('scroll', updateRect);
      return () => {
        window.removeEventListener('resize', updateRect);
        window.removeEventListener('scroll', updateRect);
      };
    }
  }, [selector]);

  if (!rect || selector === 'body') return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
        zIndex: 101,
      }}
      className="rounded-lg ring-2 ring-secondary ring-offset-2 ring-offset-transparent pointer-events-none"
    />
  );
}
