import { useState, useEffect } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { HOA } from '@/lib/types';
import { GateKprLogo } from '@/components/ui/GateKprLogo';

interface ValidatedInvite {
  id: string;
  hoa_id: string;
  house_number: string;
  street_name: string;
  city: string;
  state: string;
  zip_code: string;
  email: string | null;
}

export default function InviteSignup() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [invite, setInvite] = useState<ValidatedInvite | null>(null);
  const [hoa, setHoa] = useState<HOA | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    async function validateInvite() {
      if (!token) {
        setError('No invite token provided');
        setIsValidating(false);
        return;
      }

      try {
        // Use the secure edge function to validate the invite
        const { data, error: fnError } = await supabase.functions.invoke('validate-invite', {
          body: { token },
        });

        if (fnError) {
          console.error('Error validating invite:', fnError);
          setError('Failed to validate invite');
          setIsValidating(false);
          return;
        }

        if (!data.valid) {
          setError(data.error || 'Invalid invite link');
          setIsValidating(false);
          return;
        }

        setInvite(data.invite);
        setHoa(data.hoa);
        if (data.invite.email) {
          setEmail(data.invite.email);
        }
      } catch (err) {
        console.error('Error validating invite:', err);
        setError('Failed to validate invite');
      }

      setIsValidating(false);
    }

    validateInvite();
  }, [token]);

  if (authLoading || isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (error || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-xl">Invalid Invite</CardTitle>
            <CardDescription>{error || 'This invite link is not valid'}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Link to="/login">
              <Button variant="outline">Go to Login</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile with invite data
        await supabase.from('profiles').insert({
          user_id: authData.user.id,
          hoa_id: invite.hoa_id,
          name,
          email,
          house_number: invite.house_number,
          street_name: invite.street_name,
          city: invite.city,
          state: invite.state,
          zip_code: invite.zip_code,
          status: 'active',
        });

        // Assign resident role
        await supabase.from('user_roles').insert({
          user_id: authData.user.id,
          role: 'resident',
        });

        // Mark invite as used via secure edge function
        await supabase.functions.invoke('complete-invite', {
          body: { token, userId: authData.user.id },
        });

        toast({
          title: 'Account created!',
          description: 'Welcome to ' + (hoa?.name || 'your community'),
        });
      }
    } catch (err: any) {
      toast({
        title: 'Signup failed',
        description: err.message,
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  const fullAddress = `${invite.house_number} ${invite.street_name}, ${invite.city}, ${invite.state} ${invite.zip_code}`;

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
          <CardTitle className="text-xl">You're Invited!</CardTitle>
          <CardDescription>
            Join {hoa?.name || 'your community'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Pre-verified address</span>
              </div>
              <p className="font-medium text-foreground">{fullAddress}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={!!invite.email}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">At least 6 characters</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
            <span className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-secondary hover:underline">
                Sign in
              </Link>
            </span>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
