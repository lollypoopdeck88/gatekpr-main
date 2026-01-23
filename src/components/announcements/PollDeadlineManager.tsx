import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar, Clock, StopCircle, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, isPast } from 'date-fns';

interface PollDeadlineManagerProps {
  pollId: string;
  announcementId: string;
  currentEndsAt: string | null;
  question: string;
}

export function PollDeadlineManager({ 
  pollId, 
  announcementId, 
  currentEndsAt, 
  question 
}: PollDeadlineManagerProps) {
  const queryClient = useQueryClient();
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [newDeadline, setNewDeadline] = useState('');

  const isExpired = currentEndsAt ? isPast(new Date(currentEndsAt)) : false;

  const updateDeadline = useMutation({
    mutationFn: async (endsAt: string | null) => {
      const { error } = await supabase
        .from('announcement_polls')
        .update({ ends_at: endsAt })
        .eq('id', pollId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcement-poll', announcementId] });
    },
  });

  const handleExtend = () => {
    if (!newDeadline) {
      toast.error('Please select a new deadline');
      return;
    }
    
    const newDate = new Date(newDeadline);
    if (isPast(newDate)) {
      toast.error('New deadline must be in the future');
      return;
    }

    updateDeadline.mutate(newDate.toISOString(), {
      onSuccess: () => {
        toast.success('Poll deadline extended');
        setShowExtendDialog(false);
        setNewDeadline('');
      },
      onError: () => toast.error('Failed to extend deadline'),
    });
  };

  const handleClose = () => {
    // Set ends_at to now to close the poll immediately
    updateDeadline.mutate(new Date().toISOString(), {
      onSuccess: () => {
        toast.success('Poll closed early');
        setShowCloseDialog(false);
      },
      onError: () => toast.error('Failed to close poll'),
    });
  };

  const handleReopen = () => {
    if (!newDeadline) {
      toast.error('Please select a new deadline');
      return;
    }

    const newDate = new Date(newDeadline);
    if (isPast(newDate)) {
      toast.error('New deadline must be in the future');
      return;
    }

    updateDeadline.mutate(newDate.toISOString(), {
      onSuccess: () => {
        toast.success('Poll reopened');
        setShowExtendDialog(false);
        setNewDeadline('');
      },
      onError: () => toast.error('Failed to reopen poll'),
    });
  };

  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
      {!isExpired ? (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExtendDialog(true)}
            className="text-xs h-7"
          >
            <Calendar className="h-3 w-3 mr-1" />
            Extend Deadline
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCloseDialog(true)}
            className="text-xs h-7 text-destructive hover:text-destructive"
          >
            <StopCircle className="h-3 w-3 mr-1" />
            Close Early
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowExtendDialog(true)}
          className="text-xs h-7"
        >
          <Clock className="h-3 w-3 mr-1" />
          Reopen Poll
        </Button>
      )}

      {/* Extend/Reopen Dialog */}
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isExpired ? 'Reopen Poll' : 'Extend Poll Deadline'}</DialogTitle>
            <DialogDescription>
              {isExpired 
                ? 'Set a new deadline to reopen voting on this poll.'
                : 'Select a new deadline for this poll.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="new-deadline">New Deadline</Label>
              <Input
                id="new-deadline"
                type="datetime-local"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              />
            </div>
            {currentEndsAt && !isExpired && (
              <p className="text-xs text-muted-foreground">
                Current deadline: {format(new Date(currentEndsAt), 'MMM d, yyyy h:mm a')}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowExtendDialog(false);
                  setNewDeadline('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={isExpired ? handleReopen : handleExtend}
                disabled={updateDeadline.isPending}
              >
                {updateDeadline.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isExpired ? (
                  'Reopen Poll'
                ) : (
                  'Extend Deadline'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Early Confirmation */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Poll Early?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately end voting on "{question}". 
              Residents will no longer be able to submit votes.
              You can reopen the poll later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClose}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {updateDeadline.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Close Poll'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
