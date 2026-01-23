import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  DollarSign, 
  Loader2, 
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Send
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FundTransfer {
  id: string;
  hoa_id: string;
  payment_id: string | null;
  amount: number;
  platform_fee: number;
  net_amount: number;
  status: string;
  received_at: string;
  transferred_at: string | null;
  payout_completed_at: string | null;
  failure_reason: string | null;
}

interface FundSummary {
  hoa_id: string;
  pending_count: number;
  pending_amount: number;
  in_transit_count: number;
  in_transit_amount: number;
  completed_count: number;
  completed_amount: number;
  total_platform_fees: number;
}

interface HOA {
  id: string;
  name: string;
  stripe_connect_id: string | null;
  stripe_connect_payouts_enabled: boolean | null;
}

export function FundsManagementSection() {
  const { isSuperAdmin, effectiveHoaId } = useAuth();
  const [selectedHoaId, setSelectedHoaId] = useState<string | 'all'>('all');
  const [selectedTransfers, setSelectedTransfers] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch all HOAs (for super admin)
  const { data: hoas } = useQuery({
    queryKey: ['hoas-funds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hoas')
        .select('id, name, stripe_connect_id, stripe_connect_payouts_enabled')
        .order('name');
      if (error) throw error;
      return data as HOA[];
    },
    enabled: isSuperAdmin,
  });

  // Determine which HOA to query
  const queryHoaId = isSuperAdmin ? (selectedHoaId === 'all' ? null : selectedHoaId) : effectiveHoaId;

  // Fetch fund transfers
  const { data: transfers, isLoading: transfersLoading } = useQuery({
    queryKey: ['fund-transfers', queryHoaId],
    queryFn: async () => {
      let query = supabase
        .from('hoa_fund_transfers')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(100);
      
      if (queryHoaId) {
        query = query.eq('hoa_id', queryHoaId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FundTransfer[];
    },
    enabled: isSuperAdmin || !!effectiveHoaId,
  });

  // Fetch fund summary
  const { data: summary } = useQuery({
    queryKey: ['fund-summary', queryHoaId],
    queryFn: async () => {
      let query = supabase
        .from('hoa_fund_summary')
        .select('*');
      
      if (queryHoaId) {
        query = query.eq('hoa_id', queryHoaId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Aggregate if viewing all
      if (!queryHoaId && data) {
        return {
          pending_count: data.reduce((sum, s) => sum + (s.pending_count || 0), 0),
          pending_amount: data.reduce((sum, s) => sum + (s.pending_amount || 0), 0),
          in_transit_count: data.reduce((sum, s) => sum + (s.in_transit_count || 0), 0),
          in_transit_amount: data.reduce((sum, s) => sum + (s.in_transit_amount || 0), 0),
          completed_count: data.reduce((sum, s) => sum + (s.completed_count || 0), 0),
          completed_amount: data.reduce((sum, s) => sum + (s.completed_amount || 0), 0),
          total_platform_fees: data.reduce((sum, s) => sum + (s.total_platform_fees || 0), 0),
        } as FundSummary;
      }
      
      return data?.[0] as FundSummary | undefined;
    },
    enabled: isSuperAdmin || !!effectiveHoaId,
  });

  // Transfer funds mutation
  const transferMutation = useMutation({
    mutationFn: async ({ hoaId, transferIds }: { hoaId: string; transferIds?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('transfer-funds', {
        body: { hoaId, transferIds },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message, {
        description: `Total transferred: $${(data.totalAmount / 100).toFixed(2)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['fund-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['fund-summary'] });
      setSelectedTransfers([]);
    },
    onError: (error) => {
      toast.error('Failed to transfer funds', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  const handleTransferAll = (hoaId: string) => {
    const hoa = hoas?.find(h => h.id === hoaId);
    if (!hoa?.stripe_connect_payouts_enabled) {
      toast.error('Cannot transfer funds', {
        description: 'This HOA has not completed bank account setup',
      });
      return;
    }
    transferMutation.mutate({ hoaId });
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'pending_transfer':
      case 'transferred':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Transit</Badge>;
      case 'payout_pending':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Payout Pending</Badge>;
      case 'payout_complete':
        return <Badge className="bg-green-100 text-green-800">Complete</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getHoaName = (hoaId: string) => {
    return hoas?.find(h => h.id === hoaId)?.name || 'Unknown HOA';
  };

  // Group transfers by HOA for transfer actions
  const pendingByHoa = transfers?.reduce((acc, t) => {
    if (t.status === 'received') {
      if (!acc[t.hoa_id]) {
        acc[t.hoa_id] = [];
      }
      acc[t.hoa_id].push(t);
    }
    return acc;
  }, {} as Record<string, FundTransfer[]>) || {};

  if (!isSuperAdmin && !effectiveHoaId) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending (Received)</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              {formatCurrency(summary?.pending_amount || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {summary?.pending_count || 0} payment(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>In Transit</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-blue-500" />
              {formatCurrency(summary?.in_transit_amount || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {summary?.in_transit_count || 0} transfer(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Transferred</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              {formatCurrency(summary?.completed_amount || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {summary?.completed_count || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Platform Revenue</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-secondary" />
              {formatCurrency(summary?.total_platform_fees || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Total fees collected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Transfers by HOA (Super Admin only) */}
      {isSuperAdmin && Object.keys(pendingByHoa).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Pending Transfers by HOA
            </CardTitle>
            <CardDescription>
              Transfer received funds to HOA bank accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(pendingByHoa).map(([hoaId, hoaTransfers]) => {
                const hoa = hoas?.find(h => h.id === hoaId);
                const totalAmount = hoaTransfers.reduce((sum, t) => sum + t.net_amount, 0);
                const canTransfer = hoa?.stripe_connect_payouts_enabled;

                return (
                  <div
                    key={hoaId}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{getHoaName(hoaId)}</p>
                      <p className="text-sm text-muted-foreground">
                        {hoaTransfers.length} payment(s) · {formatCurrency(totalAmount)} to transfer
                      </p>
                      {!canTransfer && (
                        <p className="text-sm text-yellow-600 flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          Bank account not connected
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => handleTransferAll(hoaId)}
                      disabled={!canTransfer || transferMutation.isPending}
                      size="sm"
                    >
                      {transferMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Transfer All
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transfer History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Fund Transfer History
              </CardTitle>
              <CardDescription>
                Track all resident dues payments and transfers
              </CardDescription>
            </div>
            {isSuperAdmin && (
              <Select value={selectedHoaId} onValueChange={setSelectedHoaId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by HOA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All HOAs</SelectItem>
                  {hoas?.map((hoa) => (
                    <SelectItem key={hoa.id} value={hoa.id}>
                      {hoa.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {transfersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : transfers && transfers.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isSuperAdmin && <TableHead>HOA</TableHead>}
                    <TableHead>Amount</TableHead>
                    <TableHead>Fees</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Transferred</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      {isSuperAdmin && (
                        <TableCell className="font-medium">
                          {getHoaName(transfer.hoa_id)}
                        </TableCell>
                      )}
                      <TableCell>{formatCurrency(transfer.amount)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatCurrency(transfer.platform_fee)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(transfer.net_amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell>
                        {format(new Date(transfer.received_at), 'MMM d, h:mm a')}
                      </TableCell>
                      <TableCell>
                        {transfer.transferred_at
                          ? format(new Date(transfer.transferred_at), 'MMM d, h:mm a')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No fund transfers yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
