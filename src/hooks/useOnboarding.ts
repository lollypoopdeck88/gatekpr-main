import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';

export interface OnboardingStep {
  id: string;
  target: string; // CSS selector or element ID
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

// Resident-specific onboarding steps
const RESIDENT_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    target: 'body',
    title: 'Welcome to GateKpr! 🏠',
    description: 'Your community management portal. Let us show you around!',
    placement: 'bottom',
  },
  {
    id: 'payments',
    target: '[data-tour="payments"]',
    title: 'Manage Payments',
    description: 'View your dues, make payments, and track your payment history all in one place.',
    placement: 'bottom',
  },
  {
    id: 'announcements',
    target: '[data-tour="announcements"]',
    title: 'Stay Informed',
    description: 'Never miss important community updates. All announcements from your HOA appear here.',
    placement: 'bottom',
  },
  {
    id: 'quick-links',
    target: '[data-tour="quick-links"]',
    title: 'Quick Access',
    description: 'Access documents, directory, maintenance requests, and your profile settings quickly.',
    placement: 'top',
  },
  {
    id: 'navigation',
    target: '[data-tour="bottom-nav"]',
    title: 'Easy Navigation',
    description: 'Use the bottom navigation to quickly access all features. Tap any icon to get started!',
    placement: 'top',
  },
];

// Admin-specific onboarding steps
const ADMIN_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    target: 'body',
    title: 'Welcome to GateKpr Admin! 🏠',
    description: 'Your HOA management dashboard. Let us show you around!',
    placement: 'bottom',
  },
  {
    id: 'sidebar',
    target: '[data-tour="admin-sidebar"]',
    title: 'Admin Navigation',
    description: 'Use the sidebar to access all admin features: payments, residents, documents, violations, and more.',
    placement: 'right',
  },
  {
    id: 'dashboard-stats',
    target: '[data-tour="admin-stats"]',
    title: 'Dashboard Overview',
    description: 'Get a quick snapshot of your community: payments collected, outstanding dues, and recent activity.',
    placement: 'bottom',
  },
  {
    id: 'residents',
    target: '[data-tour="admin-residents"]',
    title: 'Manage Residents',
    description: 'Invite new residents, manage existing members, and handle join requests.',
    placement: 'bottom',
  },
  {
    id: 'settings',
    target: '[data-tour="admin-settings"]',
    title: 'HOA Settings',
    description: 'Configure payment schedules, announcements, and customize your community portal.',
    placement: 'bottom',
  },
];

const ONBOARDING_KEY = 'gatekpr_onboarding_completed';

export function useOnboarding() {
  const { profile, isLoading, isAdmin } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  // Select the appropriate steps based on user role
  const steps = useMemo(() => {
    return isAdmin ? ADMIN_ONBOARDING_STEPS : RESIDENT_ONBOARDING_STEPS;
  }, [isAdmin]);

  useEffect(() => {
    if (!isLoading && profile) {
      // Check if user has completed onboarding for their current role
      const roleKey = isAdmin ? 'admin' : 'resident';
      const completedKey = `${ONBOARDING_KEY}_${profile.user_id}_${roleKey}`;
      const completed = localStorage.getItem(completedKey);
      
      if (!completed) {
        setHasCompleted(false);
        // Small delay to let the page render first
        setTimeout(() => setIsActive(true), 500);
      }
    }
  }, [isLoading, profile, isAdmin]);

  const completeOnboarding = () => {
    if (profile) {
      const roleKey = isAdmin ? 'admin' : 'resident';
      const completedKey = `${ONBOARDING_KEY}_${profile.user_id}_${roleKey}`;
      localStorage.setItem(completedKey, 'true');
    }
    setHasCompleted(true);
    setIsActive(false);
    setCurrentStep(0);
    // Trigger celebration
    setShowCelebration(true);
  };

  const onCelebrationComplete = () => {
    setShowCelebration(false);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  const restartOnboarding = () => {
    setCurrentStep(0);
    setHasCompleted(false);
    setIsActive(true);
  };

  return {
    steps,
    currentStep,
    currentStepData: steps[currentStep],
    isActive,
    hasCompleted,
    showCelebration,
    totalSteps: steps.length,
    nextStep,
    prevStep,
    skipOnboarding,
    restartOnboarding,
    completeOnboarding,
    onCelebrationComplete,
  };
}
