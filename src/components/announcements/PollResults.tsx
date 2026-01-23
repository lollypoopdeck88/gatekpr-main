import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { BarChart3, Clock, Users, CheckCircle, Download } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { downloadCSV } from '@/lib/exportUtils';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PollDeadlineManager } from './PollDeadlineManager';

interface PollResultsProps {
  announcementId: string;
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

// Chart colors that work with both light and dark themes
const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 65%, 60%)',
  'hsl(190, 90%, 50%)',
];

export function PollResults({ announcementId }: PollResultsProps) {
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

  if (pollLoading) return null;
  if (!poll) return null;

  const isExpired = poll.ends_at ? isPast(new Date(poll.ends_at)) : false;
  const totalVoters = votes.length;

  // Calculate vote counts per option
  const voteCounts = poll.options.map((_, index) => 
    votes.filter(v => v.selected_options.includes(index)).length
  );
  const winningIndex = voteCounts.indexOf(Math.max(...voteCounts));

  // Prepare chart data
  const chartData = poll.options.map((option, index) => ({
    name: option.length > 20 ? option.slice(0, 20) + '...' : option,
    fullName: option,
    value: voteCounts[index],
    percentage: totalVoters > 0 ? Math.round((voteCounts[index] / totalVoters) * 100) : 0,
  })).filter(d => d.value > 0);

  const handleExportCSV = () => {
    if (!poll || votes.length === 0) {
      toast.error('No votes to export');
      return;
    }

    // Create summary data
    const summaryData = poll.options.map((option, index) => ({
      Option: option,
      Votes: voteCounts[index],
      Percentage: totalVoters > 0 ? `${Math.round((voteCounts[index] / totalVoters) * 100)}%` : '0%',
    }));

    // Add totals row
    summaryData.push({
      Option: 'TOTAL VOTERS',
      Votes: totalVoters,
      Percentage: '100%',
    });

    const filename = `poll_results_${poll.question.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}`;
    downloadCSV(summaryData, filename);
    toast.success('Poll results exported');
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { fullName: string; value: number; percentage: number } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-2 text-sm">
          <p className="font-medium">{data.fullName}</p>
          <p className="text-muted-foreground">{data.value} votes ({data.percentage}%)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">{poll.question}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExportCSV}
          className="h-7 px-2 text-muted-foreground hover:text-foreground"
          title="Export to CSV"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
        {poll.ends_at && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {isExpired ? (
              <span>Ended {format(new Date(poll.ends_at), 'MMM d, yyyy')}</span>
            ) : (
              <span>Ends {format(new Date(poll.ends_at), 'MMM d, yyyy')}</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Users className="h-3 w-3" />
          <span>{totalVoters} vote{totalVoters !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Pie Chart - only show if there are votes */}
      {chartData.length > 0 && (
        <div className="h-48 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                wrapperStyle={{ fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="space-y-3">
        {poll.options.map((option, index) => {
          const count = voteCounts[index];
          const percentage = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
          const isWinning = index === winningIndex && count > 0;

          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0" 
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  {isWinning && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                  <span className={isWinning ? 'font-medium' : ''}>{option}</span>
                </div>
                <span className={`tabular-nums ${isWinning ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                  {count} ({percentage}%)
                </span>
              </div>
              <Progress 
                value={percentage} 
                className="h-2"
                style={{ 
                  ['--progress-color' as string]: CHART_COLORS[index % CHART_COLORS.length] 
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Poll Management Actions for Admins */}
      <PollDeadlineManager
        pollId={poll.id}
        announcementId={announcementId}
        currentEndsAt={poll.ends_at}
        question={poll.question}
      />
    </div>
  );
}