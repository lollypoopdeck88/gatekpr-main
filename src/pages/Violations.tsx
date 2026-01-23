import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle, 
  FileWarning,
  DollarSign,
  Calendar,
  MapPin,
  MessageSquare,
  Eye,
  Check,
  AlertCircle
} from 'lucide-react';

interface ViolationWithCategory {
  id: string;
  hoa_id: string;
  resident_id: string;
  title: string;
  description: string;
  location: string | null;
  observed_at: string;
  notice_content: string | null;
  ai_generated: boolean | null;
  ai_disclaimer_shown: boolean | null;
  fine_amount: number | null;
  fine_due_date: string | null;
  status: string;
  created_at: string;
  sent_at: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  category?: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface ViolationResponse {
  id: string;
  violation_id: string;
  resident_id: string;
  response_type: string;
  message: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Pending', icon: Clock, variant: 'secondary' },
  sent: { label: 'Action Required', icon: AlertTriangle, variant: 'destructive' },
  acknowledged: { label: 'Acknowledged', icon: CheckCircle, variant: 'default' },
  disputed: { label: 'Disputed', icon: AlertCircle, variant: 'secondary' },
  resolved: { label: 'Resolved', icon: CheckCircle, variant: 'outline' },
  waived: { label: 'Waived', icon: XCircle, variant: 'outline' },
};

export default function Violations() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedViolation, setSelectedViolation] = useState<ViolationWithCategory | null>(null);
  const [responseType, setResponseType] = useState<'acknowledge' | 'dispute' | null>(null);
  const [responseMessage, setResponseMessage] = useState('');

  // Fetch violations for the current resident - only those that have been sent
  const { data: violations, isLoading } = useQuery({
    queryKey: ['my-violations', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('violations')
        .select(`
          *,
          category:violation_categories(id, name, description)
        `)
        .eq('resident_id', profile!.id)
        .neq('status', 'draft') // Only show sent violations to residents
        .order('sent_at', { ascending: false });
      
      if (error) throw error;
      return data as ViolationWithCategory[];
    },
    enabled: !!profile?.id,
  });

  // Fetch responses for selected violation
  const { data: responses } = useQuery({
    queryKey: ['violation-responses', selectedViolation?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('violation_responses')
        .select('*')
        .eq('violation_id', selectedViolation!.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as ViolationResponse[];
    },
    enabled: !!selectedViolation?.id,
  });

  // Submit response mutation
  const submitResponseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedViolation || !profile || !responseType) {
        throw new Error('Missing required data');
      }

      // Insert the response
      const { error: responseError } = await supabase
        .from('violation_responses')
        .insert({
          violation_id: selectedViolation.id,
          resident_id: profile.id,
          response_type: responseType,
          message: responseMessage || null,
        });

      if (responseError) throw responseError;

      // Update violation status
      const newStatus = responseType === 'acknowledge' ? 'acknowledged' : 'disputed';
      const updateData: Record<string, unknown> = { status: newStatus };
      
      if (responseType === 'acknowledge') {
        updateData.acknowledged_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('violations')
        .update(updateData)
        .eq('id', selectedViolation.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-violations'] });
      queryClient.invalidateQueries({ queryKey: ['violation-responses', selectedViolation?.id] });
      setResponseType(null);
      setResponseMessage('');
      toast({ 
        title: responseType === 'acknowledge' ? 'Violation Acknowledged' : 'Dispute Submitted',
        description: responseType === 'acknowledge' 
          ? 'Thank you for acknowledging this violation.' 
          : 'Your dispute has been submitted and will be reviewed.',
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error submitting response', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const activeViolations = violations?.filter(v => 
    v.status === 'sent' || v.status === 'disputed'
  ) || [];
  
  const resolvedViolations = violations?.filter(v => 
    v.status === 'acknowledged' || v.status === 'resolved' || v.status === 'waived'
  ) || [];

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const canRespond = selectedViolation?.status === 'sent';
  const hasResponded = responses && responses.length > 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Violations</h1>
          <p className="text-muted-foreground">View and respond to violation notices</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold truncate">{activeViolations.length}</p>
                  <p className="text-xs text-muted-foreground truncate">Requires Action</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold truncate">{resolvedViolations.length}</p>
                  <p className="text-xs text-muted-foreground truncate">Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex-shrink-0">
                  <DollarSign className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="min-w-0 overflow-hidden">
                  <p className="text-lg sm:text-xl font-bold truncate">
                    {formatCurrency(
                      activeViolations.reduce((sum, v) => sum + (v.fine_amount || 0), 0)
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">Outstanding Fines</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg flex-shrink-0">
                  <FileWarning className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold truncate">{violations?.length || 0}</p>
                  <p className="text-xs text-muted-foreground truncate">Total Notices</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">
              Requires Action ({activeViolations.length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resolved ({resolvedViolations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : activeViolations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h2 className="text-lg font-medium mb-2">No Active Violations</h2>
                  <p className="text-muted-foreground text-center max-w-md">
                    You have no violation notices that require your attention.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeViolations.map((violation) => (
                  <ViolationCard 
                    key={violation.id} 
                    violation={violation} 
                    onClick={() => setSelectedViolation(violation)}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="resolved" className="mt-4">
            {resolvedViolations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No resolved violations
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {resolvedViolations.map((violation) => (
                  <ViolationCard 
                    key={violation.id} 
                    violation={violation} 
                    onClick={() => setSelectedViolation(violation)}
                    formatCurrency={formatCurrency}
                    isResolved
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Violation Detail Dialog */}
        <Dialog open={!!selectedViolation} onOpenChange={(open) => !open && setSelectedViolation(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selectedViolation && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-xl">{selectedViolation.title}</DialogTitle>
                    <Badge variant={STATUS_CONFIG[selectedViolation.status]?.variant || 'secondary'}>
                      {STATUS_CONFIG[selectedViolation.status]?.label || selectedViolation.status}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Violation Details */}
                  <div className="p-4 bg-muted rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Category:</span>
                        <span className="ml-2 font-medium">{selectedViolation.category?.name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Observed:</span>
                        <span className="ml-2 font-medium">
                          {format(new Date(selectedViolation.observed_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {selectedViolation.location && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Location:</span>
                          <span className="ml-2 font-medium">{selectedViolation.location}</span>
                        </div>
                      )}
                      {selectedViolation.fine_amount && (
                        <>
                          <div>
                            <span className="text-muted-foreground">Fine Amount:</span>
                            <span className="ml-2 font-medium text-destructive">
                              {formatCurrency(selectedViolation.fine_amount)}
                            </span>
                          </div>
                          {selectedViolation.fine_due_date && (
                            <div>
                              <span className="text-muted-foreground">Due Date:</span>
                              <span className="ml-2 font-medium">
                                {format(new Date(selectedViolation.fine_due_date), 'MMM d, yyyy')}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">Description:</p>
                      <p className="text-sm">{selectedViolation.description}</p>
                    </div>
                  </div>

                  {/* Notice Content */}
                  {selectedViolation.notice_content && (
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <FileWarning className="h-4 w-4" />
                        Official Notice
                      </h4>
                      {selectedViolation.ai_generated && (
                        <p className="text-xs text-muted-foreground mb-3 italic">
                          ⚠️ This notice was generated with AI assistance. Please review for accuracy.
                        </p>
                      )}
                      <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap">
                        {selectedViolation.notice_content}
                      </div>
                    </div>
                  )}

                  {/* Response History */}
                  {hasResponded && (
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Your Responses
                      </h4>
                      <div className="space-y-2">
                        {responses?.map((response) => (
                          <div key={response.id} className="p-3 bg-secondary/50 rounded-lg text-sm">
                            <div className="flex justify-between items-start mb-1">
                              <Badge variant="outline" className="capitalize">
                                {response.response_type === 'acknowledge' ? 'Acknowledged' : 'Disputed'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(response.created_at), 'MMM d, yyyy h:mm a')}
                              </span>
                            </div>
                            {response.message && (
                              <p className="mt-2">{response.message}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolution Notes */}
                  {selectedViolation.resolution_notes && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Resolution Notes</h4>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {selectedViolation.resolution_notes}
                      </p>
                    </div>
                  )}

                  {/* Response Form */}
                  {canRespond && !responseType && (
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        Please review this notice and choose how you would like to respond:
                      </p>
                      <div className="flex gap-3">
                        <Button 
                          onClick={() => setResponseType('acknowledge')}
                          className="flex-1"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Acknowledge
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setResponseType('dispute')}
                          className="flex-1"
                        >
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Dispute
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Acknowledge Form */}
                  {responseType === 'acknowledge' && (
                    <div className="border-t pt-4 space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Acknowledge Violation</h4>
                        <p className="text-sm text-muted-foreground">
                          By acknowledging this violation, you confirm that you have read and understood the notice.
                          {selectedViolation.fine_amount && (
                            <> You are responsible for paying the fine of {formatCurrency(selectedViolation.fine_amount)}
                            {selectedViolation.fine_due_date && (
                              <> by {format(new Date(selectedViolation.fine_due_date), 'MMMM d, yyyy')}</>
                            )}.</>
                          )}
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="ackMessage">Optional Message</Label>
                        <Textarea
                          id="ackMessage"
                          value={responseMessage}
                          onChange={(e) => setResponseMessage(e.target.value)}
                          placeholder="Add any comments or notes..."
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => { setResponseType(null); setResponseMessage(''); }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => submitResponseMutation.mutate()}
                          disabled={submitResponseMutation.isPending}
                        >
                          {submitResponseMutation.isPending ? 'Submitting...' : 'Confirm Acknowledgment'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Dispute Form */}
                  {responseType === 'dispute' && (
                    <div className="border-t pt-4 space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Submit Dispute</h4>
                        <p className="text-sm text-muted-foreground">
                          Please explain why you believe this violation notice is incorrect or should be reconsidered.
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="disputeMessage">Reason for Dispute *</Label>
                        <Textarea
                          id="disputeMessage"
                          value={responseMessage}
                          onChange={(e) => setResponseMessage(e.target.value)}
                          placeholder="Explain your dispute in detail..."
                          rows={4}
                          required
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => { setResponseType(null); setResponseMessage(''); }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => submitResponseMutation.mutate()}
                          disabled={submitResponseMutation.isPending || !responseMessage.trim()}
                        >
                          {submitResponseMutation.isPending ? 'Submitting...' : 'Submit Dispute'}
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

// Violation Card Component
interface ViolationCardProps {
  violation: ViolationWithCategory;
  onClick: () => void;
  formatCurrency: (cents: number) => string;
  isResolved?: boolean;
}

function ViolationCard({ violation, onClick, formatCurrency, isResolved }: ViolationCardProps) {
  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${isResolved ? 'opacity-70 hover:opacity-100' : ''}`} 
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-medium">{violation.title}</h3>
              <Badge variant={STATUS_CONFIG[violation.status]?.variant || 'secondary'}>
                {STATUS_CONFIG[violation.status]?.label || violation.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {violation.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              {violation.category && (
                <span className="flex items-center gap-1">
                  <FileWarning className="h-3 w-3" />
                  {violation.category.name}
                </span>
              )}
              {violation.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {violation.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(violation.observed_at), 'MMM d, yyyy')}
              </span>
              {violation.fine_amount && violation.fine_amount > 0 && (
                <span className="flex items-center gap-1 text-destructive font-medium">
                  <DollarSign className="h-3 w-3" />
                  {formatCurrency(violation.fine_amount)}
                </span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
