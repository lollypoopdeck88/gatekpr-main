import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Wrench, AlertCircle, Clock, CheckCircle, MessageSquare, MapPin, User, Search, Filter } from 'lucide-react';

interface MaintenanceRequest {
  id: string;
  hoa_id: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  location: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  resident?: { id: string; name: string; email: string; house_number: string | null; street_name: string | null };
  assignee?: { id: string; name: string };
}

interface RequestUpdate {
  id: string;
  message: string;
  is_internal: boolean;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
  author?: { name: string };
}

const CATEGORIES = [
  { value: 'repair', label: 'Repair/Maintenance' },
  { value: 'key_request', label: 'Key/Access Request' },
  { value: 'common_area', label: 'Common Area Issue' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'pool', label: 'Pool/Spa' },
  { value: 'parking', label: 'Parking' },
  { value: 'noise', label: 'Noise Complaint' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', icon: AlertCircle, variant: 'secondary' as const },
  { value: 'in_progress', label: 'In Progress', icon: Clock, variant: 'default' as const },
  { value: 'resolved', label: 'Resolved', icon: CheckCircle, variant: 'outline' as const },
  { value: 'closed', label: 'Closed', icon: CheckCircle, variant: 'outline' as const },
];

const URGENCY_COLORS: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-secondary text-secondary-foreground',
  high: 'bg-orange-500 text-white',
  emergency: 'bg-destructive text-destructive-foreground',
};

export default function AdminMaintenance() {
  const { profile, effectiveHoaId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [newStatus, setNewStatus] = useState('');
  const [updateMessage, setUpdateMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-maintenance-requests', effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          resident:profiles!maintenance_requests_resident_id_fkey(id, name, email, house_number, street_name),
          assignee:profiles!maintenance_requests_assigned_to_fkey(id, name)
        `)
        .eq('hoa_id', effectiveHoaId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MaintenanceRequest[];
    },
    enabled: !!effectiveHoaId,
  });

  const { data: admins } = useQuery({
    queryKey: ['hoa-admins', effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('hoa_id', effectiveHoaId!);
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveHoaId,
  });

  const { data: updates } = useQuery({
    queryKey: ['request-updates', selectedRequest?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_request_updates')
        .select(`
          *,
          author:profiles!maintenance_request_updates_author_id_fkey(name)
        `)
        .eq('request_id', selectedRequest!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as RequestUpdate[];
    },
    enabled: !!selectedRequest?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest || !profile) throw new Error('Missing data');

      const updates: Record<string, any> = { status: newStatus };
      if (newStatus === 'resolved') updates.resolved_at = new Date().toISOString();
      if (newStatus === 'closed') updates.closed_at = new Date().toISOString();

      // Update the request
      const { error: updateError } = await supabase
        .from('maintenance_requests')
        .update(updates)
        .eq('id', selectedRequest.id);
      if (updateError) throw updateError;

      // Add update entry
      const { error: logError } = await supabase.from('maintenance_request_updates').insert({
        request_id: selectedRequest.id,
        author_id: profile.id,
        message: updateMessage || `Status changed to ${newStatus}`,
        old_status: selectedRequest.status,
        new_status: newStatus,
        is_internal: isInternal,
      });
      if (logError) throw logError;

      // Send notification email to resident
      if (!isInternal && selectedRequest.resident) {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'maintenance_request_updated',
            to: selectedRequest.resident.email,
            hoaId: effectiveHoaId,
            recipientId: selectedRequest.resident.id,
            data: {
              residentName: selectedRequest.resident.name,
              title: selectedRequest.title,
              oldStatus: selectedRequest.status,
              newStatus,
              message: updateMessage,
              appUrl: window.location.origin,
            },
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-maintenance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['request-updates', selectedRequest?.id] });
      setNewStatus('');
      setUpdateMessage('');
      setIsInternal(false);
      toast({ title: 'Request updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error updating request', description: error.message, variant: 'destructive' });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest || !profile) throw new Error('Missing data');
      
      const { error } = await supabase.from('maintenance_request_updates').insert({
        request_id: selectedRequest.id,
        author_id: profile.id,
        message: updateMessage,
        is_internal: isInternal,
      });
      if (error) throw error;

      // Notify resident if not internal
      if (!isInternal && selectedRequest.resident) {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'maintenance_request_updated',
            to: selectedRequest.resident.email,
            hoaId: effectiveHoaId,
            recipientId: selectedRequest.resident.id,
            data: {
              residentName: selectedRequest.resident.name,
              title: selectedRequest.title,
              message: updateMessage,
              appUrl: window.location.origin,
            },
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-updates', selectedRequest?.id] });
      setUpdateMessage('');
      setIsInternal(false);
      toast({ title: 'Note added' });
    },
    onError: (error: any) => {
      toast({ title: 'Error adding note', description: error.message, variant: 'destructive' });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (assigneeId: string | null) => {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({ assigned_to: assigneeId })
        .eq('id', selectedRequest!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-maintenance-requests'] });
      toast({ title: 'Assignment updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error assigning', description: error.message, variant: 'destructive' });
    },
  });

  // Filter requests
  const filteredRequests = requests?.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.resident?.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getCategoryLabel = (category: string) => CATEGORIES.find(c => c.value === category)?.label || category;
  const getStatusConfig = (status: string) => STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];

  // Stats
  const openCount = requests?.filter(r => r.status === 'open').length || 0;
  const inProgressCount = requests?.filter(r => r.status === 'in_progress').length || 0;
  const highUrgencyCount = requests?.filter(r => (r.urgency === 'high' || r.urgency === 'emergency') && r.status !== 'closed').length || 0;

  return (
    <AppLayout adminOnly>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Maintenance Requests</h1>
          <p className="text-muted-foreground">Manage resident service requests</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Open Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" /> In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
                <Wrench className="h-4 w-4" /> High/Emergency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{highUrgencyCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredRequests?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No requests found
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRequests?.map((request) => {
              const statusConfig = getStatusConfig(request.status);
              return (
                <Card 
                  key={request.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedRequest(request);
                    setNewStatus(request.status);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-medium">{request.title}</h3>
                          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                          <Badge className={URGENCY_COLORS[request.urgency]}>
                            {request.urgency}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                          {request.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {request.resident?.name}
                            {request.resident?.house_number && ` • ${request.resident.house_number} ${request.resident.street_name}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            {getCategoryLabel(request.category)}
                          </span>
                          {request.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {request.location}
                            </span>
                          )}
                          <span>{format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {request.assignee && (
                          <Badge variant="outline">
                            Assigned: {request.assignee.name}
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Request Detail Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selectedRequest && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle>{selectedRequest.title}</DialogTitle>
                    <Badge variant={getStatusConfig(selectedRequest.status).variant}>
                      {getStatusConfig(selectedRequest.status).label}
                    </Badge>
                    <Badge className={URGENCY_COLORS[selectedRequest.urgency]}>
                      {selectedRequest.urgency}
                    </Badge>
                  </div>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Request Info */}
                  <div className="p-4 bg-muted rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Resident:</span>
                        <span className="ml-2 font-medium">{selectedRequest.resident?.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Category:</span>
                        <span className="ml-2 font-medium">{getCategoryLabel(selectedRequest.category)}</span>
                      </div>
                      {selectedRequest.resident?.house_number && (
                        <div>
                          <span className="text-muted-foreground">Address:</span>
                          <span className="ml-2 font-medium">
                            {selectedRequest.resident.house_number} {selectedRequest.resident.street_name}
                          </span>
                        </div>
                      )}
                      {selectedRequest.location && (
                        <div>
                          <span className="text-muted-foreground">Location:</span>
                          <span className="ml-2 font-medium">{selectedRequest.location}</span>
                        </div>
                      )}
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Submitted:</span>
                        <span className="ml-2 font-medium">
                          {format(new Date(selectedRequest.created_at), 'EEEE, MMMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm border-t pt-3">{selectedRequest.description}</p>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Update Status</Label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Assign To</Label>
                      <Select 
                        value={selectedRequest.assigned_to || 'unassigned'} 
                        onValueChange={(v) => assignMutation.mutate(v === 'unassigned' ? null : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {admins?.map((admin) => (
                            <SelectItem key={admin.id} value={admin.id}>{admin.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Add Note */}
                  <div className="space-y-2">
                    <Label>Add Note / Update Message</Label>
                    <Textarea
                      value={updateMessage}
                      onChange={(e) => setUpdateMessage(e.target.value)}
                      placeholder="Add a note for the resident or internal..."
                      rows={3}
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          className="rounded"
                        />
                        Internal note (not visible to resident)
                      </label>
                      <div className="flex gap-2">
                        {newStatus !== selectedRequest.status && (
                          <Button 
                            onClick={() => updateStatusMutation.mutate()}
                            disabled={updateStatusMutation.isPending}
                          >
                            {updateStatusMutation.isPending ? 'Updating...' : 'Update Status'}
                          </Button>
                        )}
                        {updateMessage && newStatus === selectedRequest.status && (
                          <Button 
                            variant="outline"
                            onClick={() => addNoteMutation.mutate()}
                            disabled={addNoteMutation.isPending}
                          >
                            Add Note
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Updates History */}
                  <div>
                    <h4 className="font-medium mb-3">Activity Log</h4>
                    {updates?.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
                    ) : (
                      <div className="space-y-3 max-h-[200px] overflow-y-auto">
                        {updates?.map((update) => (
                          <div key={update.id} className={`p-3 border rounded-lg ${update.is_internal ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' : ''}`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{update.author?.name || 'Staff'}</span>
                                {update.is_internal && (
                                  <Badge variant="outline" className="text-xs">Internal</Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(update.created_at), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            {update.new_status && (
                              <Badge variant="outline" className="mb-2">
                                {update.old_status} → {update.new_status}
                              </Badge>
                            )}
                            <p className="text-sm">{update.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedRequest(null)}>Close</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}