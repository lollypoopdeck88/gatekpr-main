import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Default feature settings - all optional features are disabled by default
// Core features (payments, documents, announcements) are always enabled
export interface HoaFeatures {
  violations: boolean;
  spaces: boolean;
  maintenance: boolean;
  directory: boolean;
}

export const defaultFeatures: HoaFeatures = {
  violations: false,
  spaces: false,
  maintenance: false,
  directory: true, // Directory is on by default as it's low-friction
};

export const featureConfig = {
  violations: {
    label: 'Violation Tracking',
    description: 'Track and manage community violations, send notices, and collect fines.',
    icon: 'AlertTriangle',
  },
  spaces: {
    label: 'Space Reservations',
    description: 'Allow residents to reserve community spaces like clubhouses, pools, and courts.',
    icon: 'Building2',
  },
  maintenance: {
    label: 'Maintenance Requests',
    description: 'Let residents submit maintenance requests with real-time status tracking.',
    icon: 'Wrench',
  },
  directory: {
    label: 'Resident Directory',
    description: 'Searchable directory helps neighbors connect while respecting privacy.',
    icon: 'Users',
  },
} as const;

export function useHoaFeatures() {
  const { effectiveHoaId } = useAuth();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['hoa-settings', effectiveHoaId],
    queryFn: async () => {
      if (!effectiveHoaId) return null;
      
      const { data, error } = await supabase
        .from('hoas')
        .select('settings')
        .eq('id', effectiveHoaId)
        .single();
      
      if (error) throw error;
      return data?.settings as { features?: Partial<HoaFeatures> } | null;
    },
    enabled: !!effectiveHoaId,
  });

  // Merge default features with stored settings
  const features: HoaFeatures = {
    ...defaultFeatures,
    ...(settings?.features || {}),
  };

  const isFeatureEnabled = (feature: keyof HoaFeatures): boolean => {
    return features[feature] ?? defaultFeatures[feature];
  };

  return {
    features,
    isFeatureEnabled,
    isLoading,
  };
}
