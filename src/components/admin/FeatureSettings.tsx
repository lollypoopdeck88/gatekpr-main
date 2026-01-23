import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AlertTriangle, Building2, Wrench, Users, Sparkles } from 'lucide-react';
import { defaultFeatures, featureConfig, type HoaFeatures } from '@/hooks/useHoaFeatures';

const iconMap = {
  AlertTriangle,
  Building2,
  Wrench,
  Users,
};

export function FeatureSettings() {
  const { effectiveHoaId } = useAuth();
  const queryClient = useQueryClient();
  const [features, setFeatures] = useState<HoaFeatures>(defaultFeatures);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current HOA settings
  const { data: hoaSettings } = useQuery({
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

  // Initialize features from settings
  useEffect(() => {
    if (hoaSettings?.features) {
      setFeatures({
        ...defaultFeatures,
        ...hoaSettings.features,
      });
    }
  }, [hoaSettings]);

  // Update feature settings
  const updateFeatures = useMutation({
    mutationFn: async (newFeatures: HoaFeatures) => {
      // Get current settings to preserve other fields
      const { data: currentHoa, error: fetchError } = await supabase
        .from('hoas')
        .select('settings')
        .eq('id', effectiveHoaId!)
        .single();
      
      if (fetchError) throw fetchError;

      const currentSettings = (currentHoa?.settings as Record<string, unknown>) || {};
      
      // Cast features to a plain object for JSON compatibility
      const featuresAsJson: Record<string, boolean> = { ...newFeatures };
      
      const newSettings = JSON.parse(JSON.stringify({
        ...currentSettings,
        features: featuresAsJson,
      }));
      
      const { error } = await supabase
        .from('hoas')
        .update({ settings: newSettings })
        .eq('id', effectiveHoaId!);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hoa-settings'] });
      toast.success('Feature settings updated');
      setHasChanges(false);
    },
    onError: () => {
      toast.error('Failed to update feature settings');
    },
  });

  const handleToggle = (feature: keyof HoaFeatures) => {
    setFeatures(prev => {
      const updated = { ...prev, [feature]: !prev[feature] };
      setHasChanges(true);
      return updated;
    });
  };

  const handleSave = () => {
    updateFeatures.mutate(features);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Optional Features
        </CardTitle>
        <CardDescription>
          Enable or disable features based on your community's needs. Core features like payments, 
          documents, and announcements are always available.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          {(Object.keys(featureConfig) as Array<keyof HoaFeatures>).map((key) => {
            const config = featureConfig[key];
            const Icon = iconMap[config.icon as keyof typeof iconMap];
            
            return (
              <div
                key={key}
                className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <Label htmlFor={key} className="text-base font-medium cursor-pointer">
                      {config.label}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {config.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={key}
                  checked={features[key]}
                  onCheckedChange={() => handleToggle(key)}
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
          </p>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateFeatures.isPending}
          >
            {updateFeatures.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
