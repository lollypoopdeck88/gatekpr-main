import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Bell, ChevronRight, Loader2, AlertTriangle, Sparkles, Users, FileText, Building2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, startOfDay } from 'date-fns';
import type { Announcement, PaymentRequest } from '@/lib/types';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { AddToCalendarButton } from '@/components/calendar/AddToCalendarButton';

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [payingId, setPayingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { profile, user, effectiveHoaId, isAdmin } = useAuth();

  // Fetch HOA details for branding
  const { data: hoaData } = useQuery({
    queryKey: ['hoa-branding', effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hoas')
        .select('name')
        .eq('id', effectiveHoaId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveHoaId,
  });

  // Fetch active violations for this resident
  const { data: activeViolations } = useQuery({
    queryKey: ['my-active-violations', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('violations')
        .select('id, title, fine_amount, status')
        .eq('resident_id', profile!.id)
        .in('status', ['sent', 'disputed']);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  // Handle payment success/cancel from Stripe redirect
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');

    if (paymentStatus === 'success' && sessionId) {
      // Verify the payment and update database
      const verifyPayment = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('verify-resident-payment', {
            body: { sessionId },
          });
          
          if (error) throw error;
          
          if (data.success) {
            toast.success('Payment successful!', {
              description: `$${data.amount?.toFixed(2) || ''} payment has been recorded.`,
            });
            queryClient.invalidateQueries({ queryKey: ['my-pending-payments'] });
          }
        } catch (err) {
          console.error('Payment verification error:', err);
          toast.error('Payment verification failed');
        }
      };
      
      verifyPayment();
      // Clear URL params
      setSearchParams({});
    } else if (paymentStatus === 'cancelled') {
      toast.info('Payment cancelled');
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, queryClient]);

  // Fetch pending payments for current user
  const { data: pendingPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['my-pending-payments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_requests')
        .select('*, payment_schedule:payment_schedules(name)')
        .eq('resident_id', user!.id)
        .in('status', ['pending', 'overdue']);
      if (error) throw error;
      return data as (PaymentRequest & { payment_schedule: { name: string } })[];
    },
    enabled: !!user?.id,
  });

  // Fetch recent announcements
  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ['recent-announcements', effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('hoa_id', effectiveHoaId!)
        .order('published_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!effectiveHoaId,
  });

  const handlePayNow = async (paymentRequestId: string) => {
    setPayingId(paymentRequestId);
    try {
      const { data, error } = await supabase.functions.invoke('create-resident-payment', {
        body: { paymentRequestId },
      });
      
      if (error) throw error;
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast.error('Failed to start payment', {
        description: err instanceof Error ? err.message : 'Please try again',
      });
      setPayingId(null);
    }
  };

  const totalDue = pendingPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  // Check if user is exploring without an HOA
  const isExploring = !effectiveHoaId;

  return (
    <AppLayout>
      <OnboardingTour />
      <div className="space-y-6">
        {/* Welcome with HOA Branding */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {profile?.name?.split(' ')[0] || 'Resident'}
          </h1>
          <p className="text-muted-foreground">
            {isExploring ? 'Explore GateKpr' : (hoaData?.name || 'Your HOA') + ' Dashboard'}
          </p>
        </div>

        {/* Exploration Welcome Card - shown when user has no HOA */}
        {isExploring && (
          <Card className="border-2 border-secondary/30 bg-gradient-to-br from-secondary/5 to-accent/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-secondary/10 rounded-xl">
                  <Sparkles className="h-6 w-6 text-secondary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">You're Exploring GateKpr!</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Browse all the features to see how GateKpr can help manage your community. 
                    To see real data, either create your own HOA or join an existing community.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link to="/request-join">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Users className="h-4 w-4" />
                        Join Community
                      </Button>
                    </Link>
                    <Link to="/signup">
                      <Button size="sm" className="gap-2 bg-secondary hover:bg-secondary/90">
                        <Building2 className="h-4 w-4" />
                        Create HOA
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Violation Warning Banner */}
        {!isExploring && activeViolations && activeViolations.length > 0 && (
          <Link to="/violations">
            <Card className="border-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-destructive/20 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-destructive">
                      {activeViolations.length} Violation{activeViolations.length !== 1 ? 's' : ''} Require{activeViolations.length === 1 ? 's' : ''} Your Attention
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total fines: ${(activeViolations.reduce((sum, v) => sum + (v.fine_amount || 0), 0) / 100).toFixed(2)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-destructive" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Payment Due Card */}
        <Card data-tour="payments">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-secondary" />
              Payments Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-bold">${totalDue.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">
                    {pendingPayments?.length || 0} payment{pendingPayments?.length !== 1 ? 's' : ''} due
                  </p>
                </div>
                {pendingPayments && pendingPayments.length > 0 && (
                  <div className="space-y-3 pt-2 border-t">
                    {pendingPayments.map((payment) => {
                      const dueDate = new Date(payment.due_date);
                      const reminderDate = startOfDay(addDays(dueDate, -3)); // Remind 3 days before
                      reminderDate.setHours(9, 0, 0, 0); // Set to 9 AM
                      const reminderEnd = new Date(reminderDate);
                      reminderEnd.setHours(10, 0, 0, 0);
                      
                      return (
                        <div key={payment.id} className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {payment.payment_schedule?.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Due: {format(dueDate, 'MMM d, yyyy')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold whitespace-nowrap">
                                ${Number(payment.amount).toFixed(2)}
                              </span>
                              <Button
                                size="sm"
                                onClick={() => handlePayNow(payment.id)}
                                disabled={payingId === payment.id}
                              >
                                {payingId === payment.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Pay Now'
                                )}
                              </Button>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <AddToCalendarButton
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7"
                              event={{
                                title: `Payment Due: ${payment.payment_schedule?.name}`,
                                description: `HOA payment of $${Number(payment.amount).toFixed(2)} is due on ${format(dueDate, 'MMMM d, yyyy')}. Please log in to GateKpr to make your payment.`,
                                startDate: reminderDate,
                                endDate: reminderEnd,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card data-tour="announcements">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-5 w-5 text-secondary" />
                Recent Announcements
              </CardTitle>
              <Link to="/announcements" className="text-sm text-secondary hover:underline">
                View All
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {announcementsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : announcements && announcements.length > 0 ? (
              <div className="space-y-3">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="border-b pb-3 last:border-0 last:pb-0">
                    <h3 className="font-medium text-sm">{announcement.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(announcement.published_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No announcements yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="space-y-2" data-tour="quick-links">
          <h2 className="text-sm font-medium text-muted-foreground">Quick Links</h2>
          {[
            { label: 'Payment History', path: '/payments' },
            { label: 'Documents', path: '/documents' },
            { label: 'Resident Directory', path: '/directory' },
            { label: 'My Profile', path: '/profile' },
          ].map(({ label, path }) => (
            <Link key={path} to={path}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="flex items-center justify-between py-3">
                  <span className="font-medium">{label}</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
