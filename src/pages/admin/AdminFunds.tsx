import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  Building2, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ArrowUpRight,
  RefreshCw,
  Loader2,
  Send,
  Settings
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { TransferScheduleSettings } from '@/components/admin/TransferScheduleSettings';

type TransferStatus = 'pending' | 'transferred' | 'in_transit' | 'completed' | 'failed';

export default function AdminFunds() {
  const { isSuperAdmin, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedHoaFilter, setSelectedHoaFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Fetch all HOAs for filter
  const { data: hoas } = useQuery({
    queryKey: ['all-hoas-funds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hoas')
        .select('id, name, stripe_connect_id, stripe_connect_onboarding_completed, stripe_connect_payouts_enabled')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin,
  });

  // Fetch fund summary per HOA
  const { data: fundSummary } = useQuery({
    queryKey: ['fund-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hoa_fund_summary')
        .select('*');
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin,
  });

  // Fetch all fund transfers
  const { data: transfers, isLoading: transfersLoading } = useQuery({
    queryKey: ['all-fund-transfers', selectedHoaFilter, selectedStatusFilter],
    queryFn: async () => {
      let query = supabase
        .from('hoa_fund_transfers')
        .select(`
          *,
          hoa:hoas(id, name)
        `)
        .order('created_at', { ascending: false });

      if (selectedHoaFilter !== 'all') {
        query = query.eq('hoa_id', selectedHoaFilter);
      }
      if (selectedStatusFilter !== 'all') {
        query = query.eq('status', selectedStatusFilter);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin,
  });

  // Bulk transfer mutation
  const bulkTransferMutation = useMutation({
    mutationFn: async (hoaId: string) => {
      const { data, error } = await supabase.functions.invoke('transfer-funds', {
        body: { hoa_id: hoaId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Funds transferred successfully');
      queryClient.invalidateQueries({ queryKey: ['all-fund-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['fund-summary'] });
    },
    onError: (error: Error) => {
      toast.error(`Transfer failed: ${error.message}`);
    },
  });

  // Transfer all pending
  const transferAllMutation = useMutation({
    mutationFn: async () => {
      const eligibleHoas = hoas?.filter(h => h.stripe_connect_payouts_enabled) || [];
      const results = await Promise.allSettled(
        eligibleHoas.map(hoa => 
          supabase.functions.invoke('transfer-funds', {
            body: { hoa_id: hoa.id },
          })
        )
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        throw new Error(`${failed} transfers failed`);
      }
      return results;
    },
    onSuccess: () => {
      toast.success('All pending funds transferred');
      queryClient.invalidateQueries({ queryKey: ['all-fund-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['fund-summary'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <AppLayout adminOnly>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      </AppLayout>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Calculate totals
  const totalPending = fundSummary?.reduce((sum, s) => sum + (s.pending_amount || 0), 0) || 0;
  const totalInTransit = fundSummary?.reduce((sum, s) => sum + (s.in_transit_amount || 0), 0) || 0;
  const totalCompleted = fundSummary?.reduce((sum, s) => sum + (s.completed_amount || 0), 0) || 0;
  const totalPlatformFees = fundSummary?.reduce((sum, s) => sum + (s.total_platform_fees || 0), 0) || 0;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusBadge = (status: TransferStatus) => {
    const statusConfig: Record<TransferStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      pending: { variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
      transferred: { variant: 'outline', icon: <ArrowUpRight className="h-3 w-3" /> },
      in_transit: { variant: 'outline', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
      completed: { variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
      failed: { variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {status}
      </Badge>
    );
  };

  const eligibleForTransfer = hoas?.filter(h => h.stripe_connect_payouts_enabled) || [];

  return (
    <AppLayout adminOnly>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fund Management</h1>
            <p className="text-muted-foreground">View and manage HOA fund transfers</p>
          </div>
          <Button
            onClick={() => transferAllMutation.mutate()}
            disabled={transferAllMutation.isPending || eligibleForTransfer.length === 0}
          >
            {transferAllMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Transfer All Pending
          </Button>
        </div>

        {/* Tabs for Overview and Settings */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Schedule Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            <TransferScheduleSettings />
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPending)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting transfer
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
              <RefreshCw className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalInTransit)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Being processed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalCompleted)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Successfully transferred
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Platform Fees</CardTitle>
              <DollarSign className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPlatformFees)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total collected
              </p>
            </CardContent>
          </Card>
        </div>

        {/* HOA Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle>HOA Balances</CardTitle>
            <CardDescription>Pending balances by HOA with transfer capability</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>HOA</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>In Transit</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Connect Status</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hoas?.map((hoa) => {
                  const summary = fundSummary?.find(s => s.hoa_id === hoa.id);
                  const canTransfer = hoa.stripe_connect_payouts_enabled && (summary?.pending_amount || 0) > 0;
                  
                  return (
                    <TableRow key={hoa.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{hoa.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(summary?.pending_amount || 0)}</TableCell>
                      <TableCell>{formatCurrency(summary?.in_transit_amount || 0)}</TableCell>
                      <TableCell>{formatCurrency(summary?.completed_amount || 0)}</TableCell>
                      <TableCell>
                        {hoa.stripe_connect_payouts_enabled ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </Badge>
                        ) : hoa.stripe_connect_id ? (
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Not Connected
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canTransfer || bulkTransferMutation.isPending}
                          onClick={() => bulkTransferMutation.mutate(hoa.id)}
                        >
                          {bulkTransferMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-3 w-3 mr-1" />
                              Transfer
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Transfers History */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Transfer History</CardTitle>
                <CardDescription>All fund transfers across HOAs</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedHoaFilter} onValueChange={setSelectedHoaFilter}>
                  <SelectTrigger className="w-[180px]">
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
                <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="transferred">Transferred</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {transfersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : transfers && transfers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>HOA</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Platform Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transferred At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer: any) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(transfer.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{transfer.hoa?.name || 'Unknown'}</span>
                      </TableCell>
                      <TableCell>{formatCurrency(transfer.amount)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(transfer.net_amount)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatCurrency(transfer.platform_fee || 0)}
                      </TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {transfer.transferred_at 
                          ? format(new Date(transfer.transferred_at), 'MMM d, yyyy HH:mm')
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No fund transfers found</p>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
