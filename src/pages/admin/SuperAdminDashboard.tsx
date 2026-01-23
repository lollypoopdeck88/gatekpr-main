import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Plus,
  ArrowRight,
  Settings,
  Upload,
  Shield,
  UserCog,
  ClipboardList
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { CreateHoaDialog } from '@/components/super-admin/CreateHoaDialog';
import { UserSpoofDialog } from '@/components/super-admin/UserSpoofDialog';
import { ManageRolesDialog } from '@/components/super-admin/ManageRolesDialog';
import { SubscriptionManagementDialog } from '@/components/super-admin/SubscriptionManagementDialog';
import { AuditLogViewer } from '@/components/super-admin/AuditLogViewer';
import type { Profile } from '@/lib/types';

export default function SuperAdminDashboard() {
  const { isSuperAdmin, isLoading, startSpoof } = useAuth();

  // Fetch all HOAs with stats
  const { data: hoas } = useQuery({
    queryKey: ['super-admin-hoas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hoas')
        .select(`
          *,
          profiles:profiles(count),
          hoa_subscriptions(status, plan_name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin,
  });

  // Fetch overall stats
  const { data: stats } = useQuery({
    queryKey: ['super-admin-stats'],
    queryFn: async () => {
      const [hoaCount, residentCount, paymentSum] = await Promise.all([
        supabase.from('hoas').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('amount'),
      ]);
      
      const totalPayments = paymentSum.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      
      return {
        totalHoas: hoaCount.count || 0,
        totalResidents: residentCount.count || 0,
        totalPayments,
      };
    },
    enabled: isSuperAdmin,
  });

  if (isLoading) {
    return (
      <AppLayout adminOnly>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary" />
        </div>
      </AppLayout>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleSpoof = (profile: Profile) => {
    startSpoof(profile);
  };

  return (
    <AppLayout adminOnly>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Super Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage all HOAs and platform operations</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AuditLogViewer />
            <ManageRolesDialog />
            <SubscriptionManagementDialog />
            <UserSpoofDialog onSpoof={handleSpoof} />
            <CreateHoaDialog />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total HOAs</CardTitle>
              <Building2 className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalHoas || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Residents</CardTitle>
              <Users className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalResidents || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${((stats?.totalPayments || 0) / 100).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <AuditLogViewer 
                trigger={
                  <Button variant="outline" className="w-full h-20 flex-col gap-2">
                    <ClipboardList className="h-5 w-5" />
                    <span>Audit Log</span>
                  </Button>
                }
              />
              <Link to="/admin/data-import">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <Upload className="h-5 w-5" />
                  <span>Data Import</span>
                </Button>
              </Link>
              <Link to="/admin/financials">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Financials</span>
                </Button>
              </Link>
              <Link to="/admin/residents">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <Users className="h-5 w-5" />
                  <span>All Residents</span>
                </Button>
              </Link>
              <ManageRolesDialog 
                trigger={
                  <Button variant="outline" className="w-full h-20 flex-col gap-2">
                    <UserCog className="h-5 w-5" />
                    <span>Manage Roles</span>
                  </Button>
                }
              />
              <SubscriptionManagementDialog 
                trigger={
                  <Button variant="outline" className="w-full h-20 flex-col gap-2">
                    <Shield className="h-5 w-5" />
                    <span>Subscriptions</span>
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* HOAs Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>All HOAs</CardTitle>
              <CardDescription>Manage homeowners associations</CardDescription>
            </div>
            <CreateHoaDialog 
              trigger={
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add HOA
                </Button>
              } 
            />
          </CardHeader>
          <CardContent>
            {hoas && hoas.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Residents</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hoas.map((hoa: any) => (
                    <TableRow key={hoa.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{hoa.name}</p>
                          {hoa.address && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs">
                              {hoa.address}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {Array.isArray(hoa.profiles) ? hoa.profiles.length : hoa.profiles?.count || 0}
                      </TableCell>
                      <TableCell>
                        {hoa.hoa_subscriptions?.[0]?.plan_name || 'No plan'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={hoa.hoa_subscriptions?.[0]?.status === 'active' ? 'default' : 'secondary'}>
                          {hoa.hoa_subscriptions?.[0]?.status || 'inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link to={`/admin?hoa=${hoa.id}`}>
                          <Button size="sm" variant="ghost">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No HOAs yet. Create your first one!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
