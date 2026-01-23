import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  Building2, 
  Loader2, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Banknote
} from 'lucide-react';

interface ConnectStatus {
  connected: boolean;
  status: string;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  onboardingCompleted: boolean;
  requiresAction: boolean;
  pendingRequirements: string[];
  externalAccounts: number;
}

export function BankAccountSection() {
  const { effectiveHoaId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch Connect account status
  const { data: connectStatus, isLoading: statusLoading, refetch } = useQuery({
    queryKey: ['connect-status', effectiveHoaId],
    queryFn: async (): Promise<ConnectStatus> => {
      const { data, error } = await supabase.functions.invoke('get-connect-status', {
        body: { hoaId: effectiveHoaId },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveHoaId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch HOA details
  const { data: hoa } = useQuery({
    queryKey: ['hoa-bank', effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hoas')
        .select('id, name')
        .eq('id', effectiveHoaId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveHoaId,
  });

  const handleConnectBank = async () => {
    if (!effectiveHoaId || !hoa) {
      toast.error('Please select an HOA first');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        body: {
          hoaId: effectiveHoaId,
          hoaName: hoa.name,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success('Opening bank account setup...', {
          description: 'Complete the setup in the new window.',
        });
      }
    } catch (error) {
      console.error('Connect bank error:', error);
      toast.error('Failed to start bank account setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    await refetch();
    toast.success('Status refreshed');
  };

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = () => {
    if (!connectStatus?.connected) {
      return <Badge variant="secondary">Not Connected</Badge>;
    }
    if (connectStatus.payoutsEnabled) {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    }
    if (connectStatus.requiresAction) {
      return <Badge className="bg-yellow-100 text-yellow-800">Action Required</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800">Pending Verification</Badge>;
  };

  // Show connected account status
  if (connectStatus?.connected) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-secondary" />
                Bank Account for Dues
              </CardTitle>
              <CardDescription>
                Resident dues payments will be transferred to this account
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-3">
              {connectStatus.payoutsEnabled ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              <div>
                <p className="font-medium">
                  {connectStatus.payoutsEnabled ? 'Bank Account Connected' : 'Setup In Progress'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {connectStatus.payoutsEnabled 
                    ? `${connectStatus.externalAccounts} bank account(s) linked`
                    : 'Complete the verification to enable payouts'}
                </p>
              </div>
            </div>

            {connectStatus.requiresAction && connectStatus.pendingRequirements.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm">
                <p className="font-medium text-yellow-800 mb-1">Action Required</p>
                <p className="text-yellow-700">
                  Additional information is needed to complete your account setup.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Payouts</p>
                <p className={connectStatus.payoutsEnabled ? 'text-green-600 font-medium' : 'text-yellow-600'}>
                  {connectStatus.payoutsEnabled ? 'Enabled' : 'Pending'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Verification</p>
                <p className={connectStatus.onboardingCompleted ? 'text-green-600 font-medium' : 'text-yellow-600'}>
                  {connectStatus.onboardingCompleted ? 'Complete' : 'Incomplete'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefreshStatus}
              className="flex-1"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Status
            </Button>
            {(!connectStatus.payoutsEnabled || connectStatus.requiresAction) && (
              <Button
                onClick={handleConnectBank}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Complete Setup
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show setup prompt for new accounts
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-secondary" />
          Connect Bank Account for Dues
        </CardTitle>
        <CardDescription>
          Set up where resident dues payments should be deposited
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h4 className="font-medium">Why connect a bank account?</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>Receive resident dues payments directly to your HOA's bank account</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>Automatic transfers with full tracking and reconciliation</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>Secure bank-grade encryption and verification</span>
            </li>
          </ul>
        </div>

        <Button
          onClick={handleConnectBank}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Building2 className="mr-2 h-4 w-4" />
          )}
          Connect Bank Account
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          You'll be redirected to complete a secure verification process
        </p>
      </CardContent>
    </Card>
  );
}
