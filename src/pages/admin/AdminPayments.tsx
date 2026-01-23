import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PaymentSchedule, PaymentFrequency, Profile } from '@/lib/types';

interface PaymentRequestWithResident {
  id: string;
  amount: number;
  due_date: string;
  status: string;
  resident_id: string;
  payment_schedule: { name: string } | null;
  resident: { name: string; email: string } | null;
}

export default function AdminPayments() {
  const { effectiveHoaId, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    frequency: 'monthly' as PaymentFrequency,
    due_day: '1',
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['payment-schedules', effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('hoa_id', effectiveHoaId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PaymentSchedule[];
    },
    enabled: !!effectiveHoaId,
  });

  const { data: paymentRequests } = useQuery({
    queryKey: ['payment-requests-admin', effectiveHoaId],
    queryFn: async () => {
      // Get payment requests with resident info
      const { data, error } = await supabase
        .from('payment_requests')
        .select(`
          id,
          amount,
          due_date,
          status,
          resident_id,
          payment_schedule:payment_schedules!inner(name, hoa_id)
        `)
        .eq('payment_schedule.hoa_id', effectiveHoaId!)
        .order('due_date', { ascending: false })
        .limit(20);
      
      if (error) throw error;

      // Get resident names
      const residentIds = [...new Set(data?.map(r => r.resident_id) || [])];
      const { data: residents } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', residentIds);

      const residentMap = new Map(residents?.map(r => [r.user_id, r]) || []);

      return data?.map(req => ({
        ...req,
        resident: residentMap.get(req.resident_id) || null,
      })) as PaymentRequestWithResident[];
    },
    enabled: !!effectiveHoaId,
  });

  const createSchedule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('payment_schedules').insert({
        hoa_id: effectiveHoaId!,
        name: formData.name,
        description: formData.description || null,
        amount: parseFloat(formData.amount),
        frequency: formData.frequency,
        due_day: parseInt(formData.due_day),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
      setIsDialogOpen(false);
      setFormData({ name: '', description: '', amount: '', frequency: 'monthly', due_day: '1' });
      toast.success('Payment schedule created');
    },
    onError: () => toast.error('Failed to create schedule'),
  });

  // Show prompt to select HOA if super admin hasn't selected one
  if (isSuperAdmin && !effectiveHoaId) {
    return (
      <AppLayout adminOnly>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payments</h1>
            <p className="text-muted-foreground">Manage dues and payment schedules</p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-medium mb-2">Select an HOA</h2>
              <p className="text-muted-foreground text-center">
                Use the HOA dropdown in the sidebar to select a community first.
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payments</h1>
            <p className="text-muted-foreground">Manage dues and payment schedules</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Payment Schedule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Monthly HOA Dues"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="150.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(v) => setFormData({ ...formData, frequency: v as PaymentFrequency })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="one-time">One-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_day">Due Day of Month</Label>
                  <Input
                    id="due_day"
                    type="number"
                    min="1"
                    max="28"
                    value={formData.due_day}
                    onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <Button
                  onClick={() => createSchedule.mutate()}
                  disabled={!formData.name || !formData.amount || createSchedule.isPending}
                  className="w-full"
                >
                  Create Schedule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment Schedules</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : schedules?.length === 0 ? (
              <p className="text-muted-foreground">No payment schedules yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Due Day</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules?.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.name}</TableCell>
                      <TableCell>${Number(schedule.amount).toFixed(2)}</TableCell>
                      <TableCell className="capitalize">{schedule.frequency}</TableCell>
                      <TableCell>{schedule.due_day}</TableCell>
                      <TableCell>
                        <StatusBadge status={schedule.is_active ? 'approved' : 'pending'}>
                          {schedule.is_active ? 'Active' : 'Inactive'}
                        </StatusBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payment Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentRequests?.length === 0 ? (
              <p className="text-muted-foreground">No payment requests yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resident</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentRequests?.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{req.resident?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{req.resident?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {req.payment_schedule?.name || 'N/A'}
                      </TableCell>
                      <TableCell>${Number(req.amount).toFixed(2)}</TableCell>
                      <TableCell>{new Date(req.due_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <StatusBadge status={req.status as 'pending' | 'paid' | 'overdue'}>
                          {req.status}
                        </StatusBadge>
                      </TableCell>
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
