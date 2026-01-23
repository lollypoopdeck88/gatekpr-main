import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, Calendar, Hand, Save, PlayCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type TransferFrequency = 'daily' | 'weekly' | 'manual';

interface TransferScheduleConfig {
  frequency: TransferFrequency;
  day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
  enabled: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export function TransferScheduleSettings() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<TransferScheduleConfig>({
    frequency: 'manual',
    day_of_week: 1,
    enabled: true,
  });

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['transfer-schedule-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('key', 'transfer_schedule')
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings?.value) {
      const value = settings.value as unknown as TransferScheduleConfig;
      setConfig({
        frequency: value.frequency || 'manual',
        day_of_week: value.day_of_week ?? 1,
        enabled: value.enabled ?? true,
      });
    }
  }, [settings]);

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (newConfig: TransferScheduleConfig) => {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          value: JSON.parse(JSON.stringify(newConfig)),
          updated_at: new Date().toISOString(),
        })
        .eq('key', 'transfer_schedule');
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Transfer schedule updated');
      queryClient.invalidateQueries({ queryKey: ['transfer-schedule-settings'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  // Trigger manual transfer
  const triggerMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('process-scheduled-transfers');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Processed ${data.successfulHoas || 0} HOAs, ${data.totalTransfers || 0} transfers`);
      queryClient.invalidateQueries({ queryKey: ['all-fund-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['fund-summary'] });
    },
    onError: (error: Error) => {
      toast.error(`Transfer failed: ${error.message}`);
    },
  });

  const handleSave = () => {
    updateMutation.mutate(config);
  };

  const getFrequencyIcon = (freq: TransferFrequency) => {
    switch (freq) {
      case 'daily':
        return <Clock className="h-4 w-4" />;
      case 'weekly':
        return <Calendar className="h-4 w-4" />;
      case 'manual':
        return <Hand className="h-4 w-4" />;
    }
  };

  const getScheduleDescription = () => {
    if (!config.enabled) return 'Automatic transfers are disabled';
    switch (config.frequency) {
      case 'daily':
        return 'Transfers will be processed daily at midnight UTC';
      case 'weekly':
        return `Transfers will be processed every ${DAYS_OF_WEEK.find(d => d.value === config.day_of_week)?.label} at midnight UTC`;
      case 'manual':
        return 'Transfers must be triggered manually by a super admin';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Transfer Schedule
            </CardTitle>
            <CardDescription>
              Configure when pending fund transfers are automatically processed
            </CardDescription>
          </div>
          <Badge variant={config.enabled ? 'default' : 'secondary'}>
            {config.enabled ? 'Active' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">Enable Automatic Transfers</Label>
            <p className="text-sm text-muted-foreground">
              When disabled, all transfers must be triggered manually
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
          />
        </div>

        {/* Frequency Selection */}
        <div className="space-y-3">
          <Label className="text-base">Transfer Frequency</Label>
          <RadioGroup
            value={config.frequency}
            onValueChange={(value: TransferFrequency) => setConfig({ ...config, frequency: value })}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            disabled={!config.enabled}
          >
            <label
              className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                config.frequency === 'daily' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              } ${!config.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RadioGroupItem value="daily" id="daily" />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4" />
                  Daily
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Process every day at midnight
                </p>
              </div>
            </label>

            <label
              className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                config.frequency === 'weekly' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              } ${!config.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RadioGroupItem value="weekly" id="weekly" />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <Calendar className="h-4 w-4" />
                  Weekly
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Process once per week
                </p>
              </div>
            </label>

            <label
              className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                config.frequency === 'manual' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              } ${!config.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RadioGroupItem value="manual" id="manual" />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <Hand className="h-4 w-4" />
                  Manual Only
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Trigger transfers manually
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>

        {/* Day of Week Selection (for weekly) */}
        {config.frequency === 'weekly' && config.enabled && (
          <div className="space-y-2">
            <Label>Day of Week</Label>
            <Select
              value={config.day_of_week.toString()}
              onValueChange={(value) => setConfig({ ...config, day_of_week: parseInt(value) })}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Current Schedule Info */}
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-center gap-2 text-sm">
            {getFrequencyIcon(config.frequency)}
            <span className="text-muted-foreground">{getScheduleDescription()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
          
          <Button
            variant="outline"
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending}
          >
            {triggerMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4 mr-2" />
            )}
            Run Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
