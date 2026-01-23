import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, CalendarOff, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BlackoutDate {
  id: string;
  space_id: string;
  blackout_date: string;
  reason: string | null;
}

interface Props {
  spaceId: string;
}

export function SpaceBlackoutDates({ spaceId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [reason, setReason] = useState('');

  const { data: blackouts, isLoading } = useQuery({
    queryKey: ['blackout-dates', spaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('space_blackout_dates')
        .select('*')
        .eq('space_id', spaceId)
        .order('blackout_date');
      if (error) throw error;
      return data as BlackoutDate[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate) throw new Error('Please select a date');
      const { error } = await supabase.from('space_blackout_dates').insert({
        space_id: spaceId,
        blackout_date: format(selectedDate, 'yyyy-MM-dd'),
        reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blackout-dates', spaceId] });
      setSelectedDate(undefined);
      setReason('');
      toast({ title: 'Blackout date added' });
    },
    onError: (error: any) => {
      toast({ title: 'Error adding blackout date', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('space_blackout_dates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blackout-dates', spaceId] });
      toast({ title: 'Blackout date removed' });
    },
    onError: (error: any) => {
      toast({ title: 'Error removing blackout date', description: error.message, variant: 'destructive' });
    },
  });

  // Get dates that are already blackouts for the calendar
  const blackoutDates = blackouts?.map((b) => new Date(b.blackout_date)) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarOff className="h-5 w-5" />
          Blackout Dates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new blackout */}
        <div className="flex flex-wrap gap-4 p-4 bg-muted rounded-lg">
          <div className="flex-1 min-w-[200px]">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label>Reason (optional)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Holiday, Maintenance"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !selectedDate}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Current blackouts */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : blackouts?.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No blackout dates set</p>
        ) : (
          <div className="space-y-2">
            {blackouts?.map((blackout) => (
              <div
                key={blackout.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">
                    {format(new Date(blackout.blackout_date), 'EEEE, MMMM d, yyyy')}
                  </div>
                  {blackout.reason && (
                    <div className="text-sm text-muted-foreground">{blackout.reason}</div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => deleteMutation.mutate(blackout.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}