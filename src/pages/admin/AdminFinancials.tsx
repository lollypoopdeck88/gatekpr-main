import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Download, 
  Building2, 
  TrendingUp, 
  AlertCircle,
  Calendar,
  FileText,
  FileSpreadsheet,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { downloadCSV, formatCurrency, formatDate } from '@/lib/exportUtils';
import { generateFinancialPDF, generateFinancialExcel } from '@/lib/reportUtils';

interface PaymentWithDetails {
  id: string;
  amount: number;
  paid_at: string;
  payment_method: string | null;
  resident_id: string;
  resident_name: string;
  resident_email: string;
  hoa_name: string;
}

interface OutstandingBalance {
  resident_id: string;
  resident_name: string;
  resident_email: string;
  hoa_id: string;
  hoa_name: string;
  pending_amount: number;
  overdue_amount: number;
  pending_count: number;
  overdue_count: number;
}

interface RevenueSummary {
  hoa_id: string;
  hoa_name: string;
  total_collected: number;
  payment_count: number;
  pending_amount: number;
  overdue_amount: number;
  resident_count: number;
}

export default function AdminFinancials() {
  const { isSuperAdmin, effectiveHoaId } = useAuth();
  const [selectedHoaFilter, setSelectedHoaFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');

  // Fetch all HOAs for filter dropdown
  const { data: hoas } = useQuery({
    queryKey: ['all-hoas-financials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hoas')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin,
  });

  // Calculate date filter
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(dateRange));

  // Fetch payment history
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['financial-payments', selectedHoaFilter, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select('id, amount, paid_at, payment_method, resident_id')
        .gte('paid_at', startDate.toISOString())
        .order('paid_at', { ascending: false });

      const { data: paymentsData, error } = await query;
      if (error) throw error;

      if (!paymentsData?.length) return [];

      // Get resident details
      const residentIds = [...new Set(paymentsData.map(p => p.resident_id))];
      const { data: residents } = await supabase
        .from('profiles')
        .select('user_id, name, email, hoa_id')
        .in('user_id', residentIds);

      // Get HOA names
      const hoaIds = [...new Set(residents?.map(r => r.hoa_id).filter(Boolean) || [])];
      const { data: hoasData } = await supabase
        .from('hoas')
        .select('id, name')
        .in('id', hoaIds);

      const residentMap = new Map(residents?.map(r => [r.user_id, r]) || []);
      const hoaMap = new Map(hoasData?.map(h => [h.id, h.name]) || []);

      const result = paymentsData.map(p => {
        const resident = residentMap.get(p.resident_id);
        return {
          ...p,
          resident_name: resident?.name || 'Unknown',
          resident_email: resident?.email || '',
          hoa_name: resident?.hoa_id ? hoaMap.get(resident.hoa_id) || 'Unknown' : 'Unknown',
          hoa_id: resident?.hoa_id || '',
        };
      });

      // Filter by HOA if selected
      if (selectedHoaFilter !== 'all') {
        return result.filter(p => p.hoa_id === selectedHoaFilter);
      }

      return result as PaymentWithDetails[];
    },
    enabled: isSuperAdmin,
  });

  // Fetch outstanding balances
  const { data: outstandingBalances, isLoading: balancesLoading } = useQuery({
    queryKey: ['financial-balances', selectedHoaFilter],
    queryFn: async () => {
      const { data: requests, error } = await supabase
        .from('payment_requests')
        .select('resident_id, amount, status, schedule_id')
        .in('status', ['pending', 'overdue']);

      if (error) throw error;
      if (!requests?.length) return [];

      // Get resident and HOA info
      const residentIds = [...new Set(requests.map(r => r.resident_id))];
      const { data: residents } = await supabase
        .from('profiles')
        .select('user_id, name, email, hoa_id')
        .in('user_id', residentIds);

      const hoaIds = [...new Set(residents?.map(r => r.hoa_id).filter(Boolean) || [])];
      const { data: hoasData } = await supabase
        .from('hoas')
        .select('id, name')
        .in('id', hoaIds);

      const residentMap = new Map(residents?.map(r => [r.user_id, r]) || []);
      const hoaMap = new Map(hoasData?.map(h => [h.id, h.name]) || []);

      // Aggregate by resident
      const balanceMap = new Map<string, OutstandingBalance>();

      requests.forEach(req => {
        const resident = residentMap.get(req.resident_id);
        if (!resident?.hoa_id) return;

        if (selectedHoaFilter !== 'all' && resident.hoa_id !== selectedHoaFilter) return;

        if (!balanceMap.has(req.resident_id)) {
          balanceMap.set(req.resident_id, {
            resident_id: req.resident_id,
            resident_name: resident.name,
            resident_email: resident.email,
            hoa_id: resident.hoa_id,
            hoa_name: hoaMap.get(resident.hoa_id) || 'Unknown',
            pending_amount: 0,
            overdue_amount: 0,
            pending_count: 0,
            overdue_count: 0,
          });
        }

        const balance = balanceMap.get(req.resident_id)!;
        if (req.status === 'pending') {
          balance.pending_amount += Number(req.amount);
          balance.pending_count++;
        } else {
          balance.overdue_amount += Number(req.amount);
          balance.overdue_count++;
        }
      });

      return Array.from(balanceMap.values())
        .sort((a, b) => (b.overdue_amount + b.pending_amount) - (a.overdue_amount + a.pending_amount));
    },
    enabled: isSuperAdmin,
  });

  // Fetch revenue summary by HOA
  const { data: revenueSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['financial-summary', selectedHoaFilter, dateRange],
    queryFn: async () => {
      // Get all HOAs
      const { data: hoasData } = await supabase
        .from('hoas')
        .select('id, name');

      if (!hoasData?.length) return [];

      const summaries: RevenueSummary[] = [];

      for (const hoa of hoasData) {
        if (selectedHoaFilter !== 'all' && hoa.id !== selectedHoaFilter) continue;

        // Get residents in this HOA
        const { data: residents } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('hoa_id', hoa.id);

        const residentIds = residents?.map(r => r.user_id) || [];

        // Get payments from these residents
        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .in('resident_id', residentIds)
          .gte('paid_at', startDate.toISOString());

        // Get pending/overdue requests via payment_schedules
        const { data: schedules } = await supabase
          .from('payment_schedules')
          .select('id')
          .eq('hoa_id', hoa.id);

        const scheduleIds = schedules?.map(s => s.id) || [];

        const { data: pendingReqs } = await supabase
          .from('payment_requests')
          .select('amount, status')
          .in('schedule_id', scheduleIds)
          .in('status', ['pending', 'overdue']);

        const totalCollected = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        const pendingAmount = pendingReqs?.filter(r => r.status === 'pending').reduce((sum, r) => sum + Number(r.amount), 0) || 0;
        const overdueAmount = pendingReqs?.filter(r => r.status === 'overdue').reduce((sum, r) => sum + Number(r.amount), 0) || 0;

        summaries.push({
          hoa_id: hoa.id,
          hoa_name: hoa.name,
          total_collected: totalCollected,
          payment_count: payments?.length || 0,
          pending_amount: pendingAmount,
          overdue_amount: overdueAmount,
          resident_count: residentIds.length,
        });
      }

      return summaries.sort((a, b) => b.total_collected - a.total_collected);
    },
    enabled: isSuperAdmin,
  });

  // Export handlers - CSV
  const exportPaymentHistoryCSV = () => {
    if (!payments?.length) {
      toast.error('No payment data to export');
      return;
    }
    const exportData = payments.map(p => ({
      'Date': formatDate(p.paid_at),
      'Resident Name': p.resident_name,
      'Resident Email': p.resident_email,
      'HOA': p.hoa_name,
      'Amount': formatCurrency(p.amount),
      'Payment Method': p.payment_method || 'N/A',
    }));
    downloadCSV(exportData, 'payment_history');
    toast.success('Payment history exported as CSV');
  };

  const exportOutstandingBalancesCSV = () => {
    if (!outstandingBalances?.length) {
      toast.error('No outstanding balance data to export');
      return;
    }
    const exportData = outstandingBalances.map(b => ({
      'Resident Name': b.resident_name,
      'Resident Email': b.resident_email,
      'HOA': b.hoa_name,
      'Pending Amount': formatCurrency(b.pending_amount),
      'Pending Count': b.pending_count,
      'Overdue Amount': formatCurrency(b.overdue_amount),
      'Overdue Count': b.overdue_count,
      'Total Outstanding': formatCurrency(b.pending_amount + b.overdue_amount),
    }));
    downloadCSV(exportData, 'outstanding_balances');
    toast.success('Outstanding balances exported as CSV');
  };

  const exportRevenueSummaryCSV = () => {
    if (!revenueSummary?.length) {
      toast.error('No revenue summary data to export');
      return;
    }
    const exportData = revenueSummary.map(s => ({
      'HOA Name': s.hoa_name,
      'Total Collected': formatCurrency(s.total_collected),
      'Payment Count': s.payment_count,
      'Pending Amount': formatCurrency(s.pending_amount),
      'Overdue Amount': formatCurrency(s.overdue_amount),
      'Total Residents': s.resident_count,
    }));
    downloadCSV(exportData, 'revenue_summary');
    toast.success('Revenue summary exported as CSV');
  };

  // Export handlers - PDF
  const exportComprehensivePDF = () => {
    const selectedHoa = hoas?.find(h => h.id === selectedHoaFilter);
    
    generateFinancialPDF({
      title: 'Financial Report',
      subtitle: 'Comprehensive Financial Overview',
      generatedAt: new Date(),
      hoaName: selectedHoaFilter === 'all' ? 'All Communities' : selectedHoa?.name,
      dateRange: `Last ${dateRange} days`,
      sections: [
        {
          title: 'Summary',
          summary: [
            { label: 'Total Collected', value: formatCurrency(totalCollected), color: 'green' },
            { label: 'Pending', value: formatCurrency(totalPending), color: 'yellow' },
            { label: 'Overdue', value: formatCurrency(totalOverdue), color: 'red' },
          ],
        },
        {
          title: 'Revenue by HOA',
          tableHeaders: ['HOA', 'Residents', 'Collected', 'Pending', 'Overdue'],
          tableData: revenueSummary?.map(s => [
            s.hoa_name,
            String(s.resident_count),
            formatCurrency(s.total_collected),
            formatCurrency(s.pending_amount),
            formatCurrency(s.overdue_amount),
          ]) || [],
        },
        {
          title: 'Outstanding Balances',
          tableHeaders: ['Resident', 'HOA', 'Pending', 'Overdue', 'Total'],
          tableData: outstandingBalances?.slice(0, 20).map(b => [
            b.resident_name,
            b.hoa_name,
            formatCurrency(b.pending_amount),
            formatCurrency(b.overdue_amount),
            formatCurrency(b.pending_amount + b.overdue_amount),
          ]) || [],
        },
        {
          title: 'Recent Payments',
          tableHeaders: ['Date', 'Resident', 'HOA', 'Amount', 'Method'],
          tableData: payments?.slice(0, 30).map(p => [
            formatDate(p.paid_at),
            p.resident_name,
            p.hoa_name,
            formatCurrency(p.amount),
            p.payment_method || 'N/A',
          ]) || [],
        },
      ],
    });
    toast.success('PDF report generated');
  };

  // Export handlers - Excel
  const exportComprehensiveExcel = () => {
    generateFinancialExcel([
      {
        sheetName: 'Revenue Summary',
        headers: ['HOA', 'Residents', 'Collected', 'Pending', 'Overdue'],
        rows: revenueSummary?.map(s => [
          s.hoa_name,
          s.resident_count,
          s.total_collected,
          s.pending_amount,
          s.overdue_amount,
        ]) || [],
      },
      {
        sheetName: 'Outstanding Balances',
        headers: ['Resident', 'Email', 'HOA', 'Pending', 'Overdue', 'Total'],
        rows: outstandingBalances?.map(b => [
          b.resident_name,
          b.resident_email,
          b.hoa_name,
          b.pending_amount,
          b.overdue_amount,
          b.pending_amount + b.overdue_amount,
        ]) || [],
      },
      {
        sheetName: 'Payment History',
        headers: ['Date', 'Resident', 'Email', 'HOA', 'Amount', 'Method'],
        rows: payments?.map(p => [
          formatDate(p.paid_at),
          p.resident_name,
          p.resident_email,
          p.hoa_name,
          p.amount,
          p.payment_method || 'N/A',
        ]) || [],
      },
    ], `financial_report_${new Date().toISOString().split('T')[0]}`);
    toast.success('Excel report generated');
  };

  // Only super admins can access this page
  if (!isSuperAdmin) {
    return (
      <AppLayout adminOnly>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-medium mb-2">Access Denied</h2>
          <p className="text-muted-foreground text-center">
            This page is only accessible to super administrators.
          </p>
        </div>
      </AppLayout>
    );
  }

  const totalCollected = revenueSummary?.reduce((sum, s) => sum + s.total_collected, 0) || 0;
  const totalPending = revenueSummary?.reduce((sum, s) => sum + s.pending_amount, 0) || 0;
  const totalOverdue = revenueSummary?.reduce((sum, s) => sum + s.overdue_amount, 0) || 0;

  return (
    <AppLayout adminOnly>
      <div className="space-y-6">
        {/* Header with filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Financial Reports</h1>
            <p className="text-muted-foreground">Comprehensive financial data across all HOAs</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedHoaFilter} onValueChange={setSelectedHoaFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by HOA" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All HOAs</SelectItem>
                {hoas?.map(hoa => (
                  <SelectItem key={hoa.id} value={hoa.id}>{hoa.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={exportComprehensivePDF} className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportComprehensiveExcel} className="cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportPaymentHistoryCSV} className="cursor-pointer">
                  <Download className="h-4 w-4 mr-2" />
                  Payments CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportOutstandingBalancesCSV} className="cursor-pointer">
                  <Download className="h-4 w-4 mr-2" />
                  Balances CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportRevenueSummaryCSV} className="cursor-pointer">
                  <Download className="h-4 w-4 mr-2" />
                  Summary CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCollected)}</div>
              <p className="text-xs text-muted-foreground">Last {dateRange} days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <Calendar className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</div>
              <p className="text-xs text-muted-foreground">Awaiting payment</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(totalOverdue)}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Summary by HOA */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Revenue by HOA</CardTitle>
              <CardDescription>Financial summary for each community</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportRevenueSummaryCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : !revenueSummary?.length ? (
              <p className="text-muted-foreground">No data available</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>HOA</TableHead>
                    <TableHead>Residents</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueSummary.map(summary => (
                    <TableRow key={summary.hoa_id}>
                      <TableCell className="font-medium">{summary.hoa_name}</TableCell>
                      <TableCell>{summary.resident_count}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(summary.total_collected)}</TableCell>
                      <TableCell className="text-yellow-600">{formatCurrency(summary.pending_amount)}</TableCell>
                      <TableCell className="text-destructive">{formatCurrency(summary.overdue_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Outstanding Balances */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Outstanding Balances</CardTitle>
              <CardDescription>Residents with pending or overdue payments</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportOutstandingBalancesCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            {balancesLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : !outstandingBalances?.length ? (
              <p className="text-muted-foreground">No outstanding balances</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resident</TableHead>
                    <TableHead>HOA</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Overdue</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outstandingBalances.slice(0, 10).map(balance => (
                    <TableRow key={balance.resident_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{balance.resident_name}</p>
                          <p className="text-xs text-muted-foreground">{balance.resident_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{balance.hoa_name}</TableCell>
                      <TableCell className="text-yellow-600">
                        {formatCurrency(balance.pending_amount)}
                        {balance.pending_count > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">({balance.pending_count})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-destructive">
                        {formatCurrency(balance.overdue_amount)}
                        {balance.overdue_count > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">({balance.overdue_count})</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(balance.pending_amount + balance.overdue_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Recent payments across all communities</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportPaymentHistoryCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : !payments?.length ? (
              <p className="text-muted-foreground">No payments in selected period</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Resident</TableHead>
                    <TableHead>HOA</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.slice(0, 20).map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.paid_at)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.resident_name}</p>
                          <p className="text-xs text-muted-foreground">{payment.resident_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{payment.hoa_name}</TableCell>
                      <TableCell className="text-green-600 font-medium">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell className="text-muted-foreground">{payment.payment_method || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
