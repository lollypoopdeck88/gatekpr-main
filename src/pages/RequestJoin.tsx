import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, LogOut, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { HOA, JoinRequest } from '@/lib/types';
import { GateKprLogo } from '@/components/ui/GateKprLogo';

export default function RequestJoin() {
  const [searchParams] = useSearchParams();
  const hoaFromUrl = searchParams.get('hoa');
  
  const [selectedHoa, setSelectedHoa] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [streetName, setStreetName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  
  const { user, profile, isLoading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch available HOAs
  const { data: hoas, isLoading: hoasLoading } = useQuery({
    queryKey: ['hoas-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hoas')
        .select('id, name, address');
      if (error) throw error;
      return data as HOA[];
    },
    enabled: !!user,
  });

  // Auto-select HOA from URL parameter
  useEffect(() => {
    if (hoaFromUrl && hoas) {
      const matchingHoa = hoas.find(h => h.id === hoaFromUrl);
      if (matchingHoa) {
        setSelectedHoa(hoaFromUrl);
      }
    }
  }, [hoaFromUrl, hoas]);

  // Check if user already has a pending request
  const { data: existingRequest } = useQuery({
    queryKey: ['my-join-request', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('join_requests')
        .select('*, hoas:hoa_id(name)')
        .eq('user_id', user!.id)
        .eq('status', 'pending')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const submitRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('join_requests').insert({
        hoa_id: selectedHoa,
        user_id: user!.id,
        house_number: houseNumber,
        street_name: streetName,
        city,
        state,
        zip_code: zipCode,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Request submitted',
        description: 'Your request to join has been sent to the community administrator.',
      });
      queryClient.invalidateQueries({ queryKey: ['my-join-request'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to submit request',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user already has an HOA, redirect to dashboard
  if (profile?.hoa_id) {
    return <Navigate to="/dashboard" replace />;
  }

  // Show pending request status
  if (existingRequest) {
    const handleLogout = async () => {
      await signOut();
      navigate('/login');
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex items-center gap-2">
                <GateKprLogo size="lg" />
                <span className="text-2xl font-bold text-foreground">GateKpr</span>
              </div>
            </div>
            <CardTitle className="text-xl">Request Pending</CardTitle>
            <CardDescription>
              Your request to join is awaiting approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-secondary" />
                <span className="font-medium">Awaiting Admin Approval</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Community: {(existingRequest as any).hoas?.name}
              </p>
              <p className="text-sm text-muted-foreground">
                Address: {existingRequest.house_number} {existingRequest.street_name}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground text-center">
              An administrator will review your request soon. You'll be notified by email when approved.
            </p>
            <Button variant="outline" onClick={handleLogout} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    submitRequest.mutate();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2">
              <GateKprLogo size="lg" />
              <span className="text-2xl font-bold text-foreground">GateKpr</span>
            </div>
          </div>
          <CardTitle className="text-xl">Request to Join</CardTitle>
          <CardDescription>
            {hoaFromUrl && hoas?.find(h => h.id === hoaFromUrl) 
              ? `Join ${hoas.find(h => h.id === hoaFromUrl)?.name}`
              : 'Submit a request to join your community'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hoa">Select Community</Label>
              <Select value={selectedHoa} onValueChange={setSelectedHoa} required>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your community" />
                </SelectTrigger>
                <SelectContent>
                  {hoasLoading ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : hoas?.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No communities available
                    </div>
                  ) : (
                    hoas?.map((hoa) => (
                      <SelectItem key={hoa.id} value={hoa.id}>
                        {hoa.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {hoaFromUrl && hoas?.find(h => h.id === hoaFromUrl) && (
                <p className="text-xs text-secondary flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Pre-selected from QR code
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="houseNumber">House #</Label>
                <Input
                  id="houseNumber"
                  type="text"
                  placeholder="123"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="streetName">Street Name</Label>
                <Input
                  id="streetName"
                  type="text"
                  placeholder="Oak Lane"
                  value={streetName}
                  onChange={(e) => setStreetName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                type="text"
                placeholder="Los Angeles"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  type="text"
                  placeholder="CA"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  type="text"
                  placeholder="90210"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={submitRequest.isPending || !selectedHoa}>
              {submitRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
