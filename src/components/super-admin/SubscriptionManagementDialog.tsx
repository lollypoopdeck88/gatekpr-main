import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Building2, Plus, Loader2, Calendar, CheckCircle, XCircle, AlertCircle, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { HOA } from '@/lib/types';

interface SubscriptionManagementDialogProps {
  trigger?: React.ReactNode;
}

const PLAN_OPTIONS = [
  { id: 'starter', name: 'Starter', price: 29 },
  { id: 'professional', name: 'Professional', price: 79 },
  { id: 'enterprise', name: 'Enterprise', price: 199 },
];

const STATUS_OPTIONS = ['active', 'trialing', 'past_due', 'canceled', 'inactive'];

export function SubscriptionManagementDialog({ trigger }: SubscriptionManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<any>(null);
  const [newSubscription, setNewSubscription] = useState({
    hoaId: '',
    planName: 'starter',
    status: 'active',
  });
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  // Fetch all HOAs
  const { data: hoas } = useQuery({
    queryKey: ['all-hoas-subs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hoas')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data as HOA[];
    },
    enabled: open,
  });

  // Fetch all subscriptions with HOA info
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['all-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hoa_subscriptions')
        .select('*, hoas(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // HOAs without subscriptions
  const hoasWithoutSub = hoas?.filter(
    hoa => !subscriptions?.some((sub: any) => sub.hoa_id === hoa.id)
  ) || [];

  // Create subscription
  const createMutation = useMutation({
    mutationFn: async () => {
      const plan = PLAN_OPTIONS.find(p => p.id === newSubscription.planName);
      const hoaName = hoasWithoutSub.find(h => h.id === newSubscription.hoaId)?.name;
      
      const { data, error } = await supabase.from('hoa_subscriptions').insert({
        hoa_id: newSubscription.hoaId,
        plan_name: plan?.name || 'Starter',
        stripe_price_id: `price_${newSubscription.planName}`, // Placeholder
        status: newSubscription.status,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }).select().single();
      
      if (error) throw error;
      
      // Log the action
      await logAction({
        action: 'subscription_created',
        entityType: 'subscription',
        entityId: data.id,
        details: {
          hoa_name: hoaName,
          plan: plan?.name,
          status: newSubscription.status,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-hoas'] });
      toast.success('Subscription created');
      setNewSubscription({ hoaId: '', planName: 'starter', status: 'active' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create subscription');
    },
  });

  // Update subscription
  const updateMutation = useMutation({
    mutationFn: async (sub: any) => {
      const originalSub = subscriptions?.find((s: any) => s.id === sub.id);
      
      const { error } = await supabase
        .from('hoa_subscriptions')
        .update({
          plan_name: sub.plan_name,
          status: sub.status,
        })
        .eq('id', sub.id);
      if (error) throw error;
      
      // Log the action
      await logAction({
        action: 'subscription_updated',
        entityType: 'subscription',
        entityId: sub.id,
        details: {
          hoa_name: (originalSub?.hoas as any)?.name,
          previous_plan: originalSub?.plan_name,
          new_plan: sub.plan_name,
          previous_status: originalSub?.status,
          new_status: sub.status,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-hoas'] });
      toast.success('Subscription updated');
      setEditingSubscription(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update subscription');
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-accent" />;
      case 'trialing': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'canceled': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'trialing': return 'outline';
      case 'canceled': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Subscriptions
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-secondary" />
            Subscription Management
          </DialogTitle>
          <DialogDescription>
            Create, view, and manage HOA subscription plans.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="list" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">All Subscriptions</TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="flex-1 overflow-auto mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : subscriptions && subscriptions.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>HOA</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Period End</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub: any) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">
                          {(sub.hoas as any)?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {editingSubscription?.id === sub.id ? (
                            <Select
                              value={editingSubscription.plan_name}
                              onValueChange={(v) => setEditingSubscription({ ...editingSubscription, plan_name: v })}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PLAN_OPTIONS.map((plan) => (
                                  <SelectItem key={plan.id} value={plan.name}>
                                    {plan.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            sub.plan_name
                          )}
                        </TableCell>
                        <TableCell>
                          {editingSubscription?.id === sub.id ? (
                            <Select
                              value={editingSubscription.status}
                              onValueChange={(v) => setEditingSubscription({ ...editingSubscription, status: v })}
                            >
                              <SelectTrigger className="w-28 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center gap-2">
                              {getStatusIcon(sub.status)}
                              <Badge variant={getStatusBadgeVariant(sub.status)}>
                                {sub.status}
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {sub.current_period_end 
                            ? format(new Date(sub.current_period_end), 'MMM d, yyyy')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {editingSubscription?.id === sub.id ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateMutation.mutate(editingSubscription)}
                                disabled={updateMutation.isPending}
                              >
                                {updateMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingSubscription(null)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingSubscription({ ...sub })}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No subscriptions yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create Subscription
                </CardTitle>
                <CardDescription>
                  Assign a subscription plan to an HOA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hoasWithoutSub.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>All HOAs already have subscriptions</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label>Select HOA</Label>
                      <Select
                        value={newSubscription.hoaId}
                        onValueChange={(v) => setNewSubscription({ ...newSubscription, hoaId: v })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Choose an HOA..." />
                        </SelectTrigger>
                        <SelectContent>
                          {hoasWithoutSub.map((hoa) => (
                            <SelectItem key={hoa.id} value={hoa.id}>
                              {hoa.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Plan</Label>
                        <Select
                          value={newSubscription.planName}
                          onValueChange={(v) => setNewSubscription({ ...newSubscription, planName: v })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLAN_OPTIONS.map((plan) => (
                              <SelectItem key={plan.id} value={plan.id}>
                                {plan.name} (${plan.price}/mo)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Status</Label>
                        <Select
                          value={newSubscription.status}
                          onValueChange={(v) => setNewSubscription({ ...newSubscription, status: v })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      onClick={() => createMutation.mutate()}
                      disabled={!newSubscription.hoaId || createMutation.isPending}
                      className="w-full"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Subscription
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
