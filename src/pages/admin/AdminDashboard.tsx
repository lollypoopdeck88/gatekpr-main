import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DollarSign, Users, Bell, FileText, Building2 } from 'lucide-react';

export default function AdminDashboard() {
  const { effectiveHoaId, isSuperAdmin } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['admin-stats', effectiveHoaId],
    queryFn: async () => {
      if (!effectiveHoaId) return null;

      const [residents, announcements, documents, pendingPayments] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('hoa_id', effectiveHoaId),
        supabase.from('announcements').select('id', { count: 'exact' }).eq('hoa_id', effectiveHoaId),
        supabase.from('documents').select('id', { count: 'exact' }).eq('hoa_id', effectiveHoaId),
        supabase.from('payment_requests').select('id, amount', { count: 'exact' }).eq('status', 'pending'),
      ]);

      const totalPending = pendingPayments.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      return {
        residentsCount: residents.count || 0,
        announcementsCount: announcements.count || 0,
        documentsCount: documents.count || 0,
        pendingPaymentsCount: pendingPayments.count || 0,
        totalPendingAmount: totalPending,
      };
    },
    enabled: !!effectiveHoaId,
  });

  const { data: currentHoa } = useQuery({
    queryKey: ['current-hoa-name', effectiveHoaId],
    queryFn: async () => {
      const { data } = await supabase
        .from('hoas')
        .select('name')
        .eq('id', effectiveHoaId!)
        .maybeSingle();
      return data;
    },
    enabled: !!effectiveHoaId,
  });

  // Show prompt to select HOA if super admin hasn't selected one
  if (isSuperAdmin && !effectiveHoaId) {
    return (
      <AppLayout adminOnly>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Welcome, Super Admin</p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-medium mb-2">Select an HOA</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Use the HOA dropdown in the sidebar to select which community you want to manage.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout adminOnly>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            {currentHoa?.name ? `Managing ${currentHoa.name}` : 'Overview of your HOA operations'}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Residents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.residentsCount || 0}</div>
              <p className="text-xs text-muted-foreground">Active members</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats?.totalPendingAmount?.toFixed(2) || '0.00'}</div>
              <p className="text-xs text-muted-foreground">{stats?.pendingPaymentsCount || 0} outstanding</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Announcements</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.announcementsCount || 0}</div>
              <p className="text-xs text-muted-foreground">Published posts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.documentsCount || 0}</div>
              <p className="text-xs text-muted-foreground">Uploaded files</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
