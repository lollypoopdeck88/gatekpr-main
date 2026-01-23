import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Check, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format, isPast } from 'date-fns';

interface AnnouncementPollProps {
  announcementId: string;
  showResults?: boolean;
}

interface Poll {
  id: string;
  announcement_id: string;
  question: string;
  options: string[];
  allow_multiple: boolean;
  ends_at: string | null;
  created_at: string;
}

interface Vote {
  id: string;
  poll_id: string;
  user_id: string;
  selected_options: number[];
  created_at: string;
}

export function AnnouncementPoll({ announcementId, showResults = false }: AnnouncementPollProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);

  // Fetch poll for this announcement
  const { data: poll, isLoading: pollLoading } = useQuery({
    queryKey: ['announcement-poll', announcementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcement_polls')
        .select('*')
        .eq('announcement_id', announcementId)
        .maybeSingle();
      if (error) throw error;
      return data ? {
        ...data,
        options: data.options as string[],
      } as Poll : null;
    },
    enabled: !!announcementId,
  });

  // Fetch all votes for this poll
  const { data: votes = [] } = useQuery({
    queryKey: ['poll-votes', poll?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcement_votes')
        .select('*')
        .eq('poll_id', poll!.id);
      if (error) throw error;
      return (data || []).map(v => ({
        ...v,
        selected_options: v.selected_options as number[],
      })) as Vote[];
    },
    enabled: !!poll?.id,
  });

  // Check if user has already voted
  const userVote = votes.find(v => v.user_id === user?.id);
  const hasVoted = !!userVote;
  const isExpired = poll?.ends_at ? isPast(new Date(poll.ends_at)) : false;

  // Set initial selection from user's existing vote
  useEffect(() => {
    if (userVote) {
      setSelectedOptions(userVote.selected_options);
    }
  }, [userVote]);

  // Submit vote mutation
  const voteMutation = useMutation({
    mutationFn: async () => {
      if (!poll) throw new Error('No poll found');
      
      if (hasVoted) {
        // Update existing vote
        const { error } = await supabase
          .from('announcement_votes')
          .update({ selected_options: selectedOptions })
          .eq('id', userVote!.id);
        if (error) throw error;
      } else {
        // Insert new vote
        const { error } = await supabase
          .from('announcement_votes')
          .insert({
            poll_id: poll.id,
            user_id: user!.id,
            selected_options: selectedOptions,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poll-votes', poll?.id] });
      toast.success(hasVoted ? 'Vote updated!' : 'Vote submitted!');
    },
    onError: () => {
      toast.error('Failed to submit vote');
    },
  });

  if (pollLoading) return null;
  if (!poll) return null;

  // Calculate vote counts per option
  const voteCounts = poll.options.map((_, index) => 
    votes.filter(v => v.selected_options.includes(index)).length
  );
  const totalVoters = votes.length;
  const maxVotes = Math.max(...voteCounts, 1);

  const handleOptionToggle = (index: number) => {
    if (isExpired) return;
    
    if (poll.allow_multiple) {
      setSelectedOptions(prev => 
        prev.includes(index) 
          ? prev.filter(i => i !== index)
          : [...prev, index]
      );
    } else {
      setSelectedOptions([index]);
    }
  };

  const canSubmit = selectedOptions.length > 0 && !isExpired;
  const shouldShowResults = showResults || hasVoted || isExpired;

  return (
    <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">{poll.question}</span>
      </div>

      {poll.ends_at && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Clock className="h-3 w-3" />
          {isExpired ? (
            <span>Poll ended {format(new Date(poll.ends_at), 'MMM d, yyyy')}</span>
          ) : (
            <span>Ends {format(new Date(poll.ends_at), 'MMM d, yyyy h:mm a')}</span>
          )}
        </div>
      )}

      <div className="space-y-2">
        {poll.options.map((option, index) => (
          <div key={index} className="relative">
            {shouldShowResults ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {selectedOptions.includes(index) && (
                      <Check className="h-3 w-3 text-primary" />
                    )}
                    <span className={selectedOptions.includes(index) ? 'font-medium' : ''}>
                      {option}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {voteCounts[index]} ({totalVoters > 0 ? Math.round((voteCounts[index] / totalVoters) * 100) : 0}%)
                  </span>
                </div>
                <Progress 
                  value={totalVoters > 0 ? (voteCounts[index] / totalVoters) * 100 : 0} 
                  className="h-2"
                />
              </div>
            ) : poll.allow_multiple ? (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`option-${index}`}
                  checked={selectedOptions.includes(index)}
                  onCheckedChange={() => handleOptionToggle(index)}
                  disabled={isExpired}
                />
                <Label htmlFor={`option-${index}`} className="text-sm cursor-pointer">
                  {option}
                </Label>
              </div>
            ) : (
              <div 
                className={`flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-muted ${selectedOptions.includes(index) ? 'bg-muted' : ''}`}
                onClick={() => handleOptionToggle(index)}
              >
                <RadioGroupItem 
                  value={String(index)} 
                  id={`option-${index}`}
                  checked={selectedOptions.includes(index)}
                  disabled={isExpired}
                />
                <Label htmlFor={`option-${index}`} className="text-sm cursor-pointer flex-1">
                  {option}
                </Label>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>{totalVoters} vote{totalVoters !== 1 ? 's' : ''}</span>
        </div>
        
        {!isExpired && (
          <Button
            size="sm"
            onClick={() => voteMutation.mutate()}
            disabled={!canSubmit || voteMutation.isPending}
          >
            {hasVoted ? 'Update Vote' : 'Submit Vote'}
          </Button>
        )}
      </div>
    </div>
  );
}