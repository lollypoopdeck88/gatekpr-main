import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Receipt, CheckCircle, Clock, AlertCircle, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface PaymentWithDetails {
  id: string;
  amount: number;
  paid_at: string;
  payment_method: string | null;
  stripe_transaction_id: string | null;
  request_id: string | null;
  payment_request?: {
    due_date: string;
    payment_schedule?: {
      name: string;
    };
  } | null;
}

export default function PaymentHistory() {
  const { user, profile } = useAuth();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payment-history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          payment_request:request_id (
            due_date,
            payment_schedule:schedule_id (name)
          )
        `)
        .eq('resident_id', user!.id)
        .order('paid_at', { ascending: false });
      
      if (error) throw error;
      return data as PaymentWithDetails[];
    },
    enabled: !!user?.id,
  });

  const { data: pendingPayments } = useQuery({
    queryKey: ['pending-payments-history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_requests')
        .select('*, payment_schedule:payment_schedules(name)')
        .eq('resident_id', user!.id)
        .in('status', ['pending', 'overdue'])
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch violation fines that are unpaid
  const { data: violationFines } = useQuery({
    queryKey: ['violation-fines', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('violations')
        .select('id, title, fine_amount, fine_due_date, status, category:violation_categories(name)')
        .eq('resident_id', profile!.id)
        .in('status', ['sent', 'acknowledged', 'disputed'])
        .gt('fine_amount', 0)
        .order('fine_due_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalPending = pendingPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalViolationFines = violationFines?.reduce((sum, v) => sum + (v.fine_amount || 0), 0) || 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payment History</h1>
          <p className="text-muted-foreground">View all your past and pending payments</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">${totalPaid.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dues Pending</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">${totalPending.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Violation Fines Warning */}
        {violationFines && violationFines.length > 0 && (
          <Card className="border-destructive bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Outstanding Violation Fines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You have {violationFines.length} violation{violationFines.length !== 1 ? 's' : ''} with outstanding fines totaling{' '}
                <span className="font-semibold text-destructive">${(totalViolationFines / 100).toFixed(2)}</span>
              </p>
              {violationFines.map((violation) => (
                <Link 
                  key={violation.id}
                  to="/violations"
                  className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg border border-destructive/20 hover:bg-destructive/20 transition-colors"
                >
                  <div>
                    <p className="font-medium">{violation.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {violation.category?.name || 'Violation'} • 
                      {violation.fine_due_date && ` Due: ${format(new Date(violation.fine_due_date), 'MMM d, yyyy')}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-destructive">${((violation.fine_amount || 0) / 100).toFixed(2)}</p>
                    <Badge variant="destructive" className="text-xs">
                      {violation.status}
                    </Badge>
                  </div>
                </Link>
              ))}
              <Link to="/violations" className="block text-center text-sm text-destructive hover:underline pt-2">
                View all violations →
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Pending Payments */}
        {pendingPayments && pendingPayments.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Pending Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100"
                >
                  <div>
                    <p className="font-medium">{payment.payment_schedule?.name || 'HOA Payment'}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(payment.due_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${Number(payment.amount).toFixed(2)}</p>
                    <Badge variant={payment.status === 'overdue' ? 'destructive' : 'secondary'}>
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-5 w-5 text-secondary" />
              Completed Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : payments && payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-full">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {payment.payment_request?.payment_schedule?.name || 'HOA Payment'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(payment.paid_at), 'MMM d, yyyy • h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        ${Number(payment.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {payment.payment_method || 'Card'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No payment history yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
