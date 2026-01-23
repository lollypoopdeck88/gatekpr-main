import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Clock } from 'lucide-react';

interface AvailabilityRule {
  id: string;
  space_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? '00' : '30';
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours < 12 ? 'AM' : 'PM';
  return {
    value: `${hours.toString().padStart(2, '0')}:${minutes}:00`,
    label: `${hour12}:${minutes} ${ampm}`,
  };
});

interface Props {
  spaceId: string;
}

export function SpaceAvailabilityEditor({ spaceId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newRule, setNewRule] = useState({
    day_of_week: '1',
    start_time: '09:00:00',
    end_time: '17:00:00',
  });

  const { data: rules, isLoading } = useQuery({
    queryKey: ['availability-rules', spaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('space_availability_rules')
        .select('*')
        .eq('space_id', spaceId)
        .order('day_of_week')
        .order('start_time');
      if (error) throw error;
      return data as AvailabilityRule[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('space_availability_rules').insert({
        space_id: spaceId,
        day_of_week: parseInt(newRule.day_of_week),
        start_time: newRule.start_time,
        end_time: newRule.end_time,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-rules', spaceId] });
      toast({ title: 'Availability rule added' });
    },
    onError: (error: any) => {
      toast({ title: 'Error adding rule', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('space_availability_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-rules', spaceId] });
      toast({ title: 'Rule deleted' });
    },
    onError: (error: any) => {
      toast({ title: 'Error deleting rule', description: error.message, variant: 'destructive' });
    },
  });

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Group rules by day
  const rulesByDay = DAYS.map((day, index) => ({
    day,
    dayIndex: index,
    rules: rules?.filter((r) => r.day_of_week === index) || [],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Availability Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new rule */}
        <div className="flex flex-wrap gap-4 p-4 bg-muted rounded-lg">
          <div className="flex-1 min-w-[140px]">
            <Label>Day</Label>
            <Select value={newRule.day_of_week} onValueChange={(v) => setNewRule({ ...newRule, day_of_week: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((day, i) => (
                  <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <Label>Start Time</Label>
            <Select value={newRule.start_time} onValueChange={(v) => setNewRule({ ...newRule, start_time: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <Label>End Time</Label>
            <Select value={newRule.end_time} onValueChange={(v) => setNewRule({ ...newRule, end_time: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Current rules by day */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {rulesByDay.map(({ day, rules }) => (
              <div key={day} className="flex items-start gap-4 py-2 border-b last:border-0">
                <div className="w-28 font-medium text-sm">{day}</div>
                <div className="flex-1">
                  {rules.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Not available</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {rules.map((rule) => (
                        <div
                          key={rule.id}
                          className="flex items-center gap-2 px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                        >
                          <span>{formatTime(rule.start_time)} - {formatTime(rule.end_time)}</span>
                          <button
                            onClick={() => deleteMutation.mutate(rule.id)}
                            className="hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}