import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Send, CheckCircle, XCircle, Clock, AlertTriangle, Sparkles, FileImage, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import type { Violation, ViolationResponse, ViolationEvidence } from '@/lib/violationTypes';

interface ViolationDetailsDialogProps {
  violation: Violation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViolationDetailsDialog({ violation, open, onOpenChange }: ViolationDetailsDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Fetch responses
  const { data: responses } = useQuery({
    queryKey: ['violation-responses', violation.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('violation_responses')
        .select('*')
        .eq('violation_id', violation.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ViolationResponse[];
    },
  });

  // Fetch evidence
  const { data: evidence } = useQuery({
    queryKey: ['violation-evidence', violation.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('violation_evidence')
        .select('*')
        .eq('violation_id', violation.id);
      if (error) throw error;
      return data as ViolationEvidence[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const updateData: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === 'sent') {
        updateData.sent_at = new Date().toISOString();
      } else if (newStatus === 'resolved' || newStatus === 'waived') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user!.id;
        updateData.resolution_notes = resolutionNotes;
      }

      const { error } = await supabase
        .from('violations')
        .update(updateData)
        .eq('id', violation.id);
      
      if (error) throw error;

      // Send notification to resident if sending
      if (newStatus === 'sent' && violation.resident?.email) {
        await supabase.functions.invoke('send-email', {
          body: {
            to: violation.resident.email,
            type: 'violation_notice',
            data: {
              residentName: violation.resident.name,
              violationTitle: violation.title,
              violationDescription: violation.description,
              noticeContent: violation.notice_content,
            },
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      toast.success('Violation updated');
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to update violation'),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'sent':
        return <Badge className="bg-blue-500"><Send className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'acknowledged':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Acknowledged</Badge>;
      case 'disputed':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Disputed</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      case 'waived':
        return <Badge variant="outline">Waived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {violation.ai_generated && <Sparkles className="h-5 w-5 text-purple-500" />}
              {violation.title}
            </DialogTitle>
            {getStatusBadge(violation.status)}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Resident</p>
              <p className="font-medium">{violation.resident?.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Category</p>
              <p className="font-medium">{violation.category?.name || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Location</p>
              <p className="font-medium">{violation.location || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Observed</p>
              <p className="font-medium">{format(new Date(violation.observed_at), 'MMM d, yyyy h:mm a')}</p>
            </div>
            {violation.fine_amount > 0 && (
              <>
                <div>
                  <p className="text-muted-foreground">Fine Amount</p>
                  <p className="font-medium">${(violation.fine_amount / 100).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fine Due Date</p>
                  <p className="font-medium">
                    {violation.fine_due_date 
                      ? format(new Date(violation.fine_due_date), 'MMM d, yyyy')
                      : '-'
                    }
                  </p>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{violation.description}</p>
          </div>

          {/* Notice Content */}
          {violation.notice_content && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  Notice Content
                  {violation.ai_generated && (
                    <Badge variant="outline" className="text-purple-600 border-purple-600">
                      <Sparkles className="h-3 w-3 mr-1" />AI Generated
                    </Badge>
                  )}
                </h3>
                <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap">
                  {violation.notice_content}
                </div>
              </div>
            </>
          )}

          {/* Evidence */}
          {evidence && evidence.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileImage className="h-4 w-4" />
                  Evidence ({evidence.length})
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {evidence.map((ev) => (
                    <Card key={ev.id} className="cursor-pointer hover:shadow-md">
                      <CardContent className="p-2 text-center">
                        <FileImage className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-xs truncate mt-1">{ev.file_url.split('/').pop()}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Responses */}
          {responses && responses.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Resident Responses
                </h3>
                <div className="space-y-2">
                  {responses.map((response) => (
                    <Card key={response.id}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <Badge variant={
                            response.response_type === 'acknowledge' ? 'default' :
                            response.response_type === 'dispute' ? 'destructive' : 'secondary'
                          }>
                            {response.response_type.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(response.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        {response.message && (
                          <p className="text-sm mt-2">{response.message}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Resolution Notes (for resolving) */}
          {['sent', 'acknowledged', 'disputed'].includes(violation.status) && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Resolution Notes</Label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add notes about how this was resolved..."
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            
            {violation.status === 'draft' && (
              <Button onClick={() => updateStatus.mutate('sent')} disabled={updateStatus.isPending}>
                <Send className="h-4 w-4 mr-2" />
                Send to Resident
              </Button>
            )}
            
            {['sent', 'acknowledged', 'disputed'].includes(violation.status) && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => updateStatus.mutate('waived')}
                  disabled={updateStatus.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Waive
                </Button>
                <Button 
                  onClick={() => updateStatus.mutate('resolved')}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Resolved
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
