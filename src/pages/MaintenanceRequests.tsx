import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Plus, Wrench, AlertCircle, Clock, CheckCircle, MessageSquare, MapPin } from 'lucide-react';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  location: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

interface RequestUpdate {
  id: string;
  message: string;
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

const URGENCY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'secondary' },
  { value: 'normal', label: 'Normal', color: 'default' },
  { value: 'high', label: 'High', color: 'destructive' },
  { value: 'emergency', label: 'Emergency', color: 'destructive' },
];

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  open: { label: 'Open', icon: AlertCircle, variant: 'secondary' },
  in_progress: { label: 'In Progress', icon: Clock, variant: 'default' },
  resolved: { label: 'Resolved', icon: CheckCircle, variant: 'outline' },
  closed: { label: 'Closed', icon: CheckCircle, variant: 'outline' },
};

export default function MaintenanceRequests() {
  const { profile, effectiveHoaId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [newComment, setNewComment] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    urgency: 'normal',
    location: '',
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ['my-maintenance-requests', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('resident_id', profile!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MaintenanceRequest[];
    },
    enabled: !!profile?.id,
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

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !effectiveHoaId) throw new Error('Missing profile');
      
      const { data: newRequest, error } = await supabase
        .from('maintenance_requests')
        .insert({
          hoa_id: effectiveHoaId,
          resident_id: profile.id,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          urgency: formData.urgency,
          location: formData.location || null,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Send notification email to admins
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'maintenance_request_submitted',
          to: profile.email, // Confirmation to resident
          hoaId: effectiveHoaId,
          recipientId: profile.id,
          data: {
            residentName: profile.name,
            title: formData.title,
            category: CATEGORIES.find(c => c.value === formData.category)?.label,
            urgency: formData.urgency,
            description: formData.description,
            appUrl: window.location.origin,
          },
        },
      });

      return newRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-maintenance-requests'] });
      setIsCreateOpen(false);
      resetForm();
      toast({ title: 'Request submitted successfully!' });
    },
    onError: (error: any) => {
      toast({ title: 'Error submitting request', description: error.message, variant: 'destructive' });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest || !profile) throw new Error('Missing data');
      
      const { error } = await supabase.from('maintenance_request_updates').insert({
        request_id: selectedRequest.id,
        author_id: profile.id,
        message: newComment,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-updates', selectedRequest?.id] });
      setNewComment('');
      toast({ title: 'Comment added' });
    },
    onError: (error: any) => {
      toast({ title: 'Error adding comment', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'other',
      urgency: 'normal',
      location: '',
    });
  };

  const openRequests = requests?.filter(r => r.status === 'open' || r.status === 'in_progress') || [];
  const closedRequests = requests?.filter(r => r.status === 'resolved' || r.status === 'closed') || [];

  const getCategoryLabel = (category: string) => CATEGORIES.find(c => c.value === category)?.label || category;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Maintenance Requests</h1>
            <p className="text-muted-foreground">Submit and track service requests</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Submit Maintenance Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief description of the issue"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category *</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Urgency</Label>
                    <Select value={formData.urgency} onValueChange={(v) => setFormData({ ...formData, urgency: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {URGENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="location">Location (optional)</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Building A, Pool area"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide details about the issue..."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => createMutation.mutate()} 
                  disabled={createMutation.isPending || !formData.title || !formData.description}
                >
                  {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({openRequests.length})</TabsTrigger>
            <TabsTrigger value="closed">Closed ({closedRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : openRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
                  <h2 className="text-lg font-medium mb-2">No Active Requests</h2>
                  <p className="text-muted-foreground text-center max-w-md mb-4">
                    Need something fixed or have a question? Submit a maintenance request.
                  </p>
                  <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {openRequests.map((request) => (
                  <Card key={request.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedRequest(request)}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{request.title}</h3>
                            <Badge variant={STATUS_CONFIG[request.status].variant}>
                              {STATUS_CONFIG[request.status].label}
                            </Badge>
                            {request.urgency === 'high' || request.urgency === 'emergency' ? (
                              <Badge variant="destructive">{request.urgency}</Badge>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {request.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                            <span>Submitted {format(new Date(request.created_at), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="closed" className="mt-4">
            {closedRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No closed requests
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {closedRequests.map((request) => (
                  <Card key={request.id} className="opacity-70 cursor-pointer hover:opacity-100 transition-opacity" onClick={() => setSelectedRequest(request)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{request.title}</h3>
                            <Badge variant="outline">{STATUS_CONFIG[request.status].label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getCategoryLabel(request.category)} • Closed {request.closed_at ? format(new Date(request.closed_at), 'MMM d, yyyy') : 'recently'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Request Detail Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            {selectedRequest && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <DialogTitle>{selectedRequest.title}</DialogTitle>
                    <Badge variant={STATUS_CONFIG[selectedRequest.status].variant}>
                      {STATUS_CONFIG[selectedRequest.status].label}
                    </Badge>
                  </div>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground">Category:</span>
                        <span className="ml-2 font-medium">{getCategoryLabel(selectedRequest.category)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Urgency:</span>
                        <span className="ml-2 font-medium capitalize">{selectedRequest.urgency}</span>
                      </div>
                      {selectedRequest.location && (
                        <div className="col-span-2">
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
                    <p className="text-sm">{selectedRequest.description}</p>
                  </div>

                  {/* Updates/Comments */}
                  <div>
                    <h4 className="font-medium mb-3">Updates</h4>
                    {updates?.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No updates yet</p>
                    ) : (
                      <div className="space-y-3">
                        {updates?.map((update) => (
                          <div key={update.id} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{update.author?.name || 'Staff'}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(update.created_at), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            {update.new_status && (
                              <Badge variant="outline" className="mb-2">
                                Status changed to: {STATUS_CONFIG[update.new_status]?.label || update.new_status}
                              </Badge>
                            )}
                            <p className="text-sm">{update.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Comment */}
                  {(selectedRequest.status === 'open' || selectedRequest.status === 'in_progress') && (
                    <div className="pt-4 border-t">
                      <Label htmlFor="comment">Add a comment</Label>
                      <div className="flex gap-2 mt-2">
                        <Textarea
                          id="comment"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add additional information..."
                          className="flex-1"
                          rows={2}
                        />
                        <Button 
                          onClick={() => addCommentMutation.mutate()} 
                          disabled={addCommentMutation.isPending || !newComment.trim()}
                        >
                          Send
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}