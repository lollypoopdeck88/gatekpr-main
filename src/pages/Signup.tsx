import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserPlus, Link as LinkIcon, QrCode, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EmailVerificationStep } from '@/components/signup/EmailVerificationStep';
import { PhoneVerificationStep } from '@/components/signup/PhoneVerificationStep';
import { GateKprLogo } from '@/components/ui/GateKprLogo';

type VerificationStep = 'form' | 'email' | 'phone';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState<VerificationStep>('form');
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const { signUp, user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
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

    const { error } = await signUp(email, password, name);

    if (error) {
      toast({
        title: 'Signup failed',
        description: error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Get the newly created user ID
    const { data: { user: newUser } } = await (await import('@/integrations/supabase/client')).supabase.auth.getUser();
    if (newUser) {
      setNewUserId(newUser.id);
      setVerificationStep('email');
    }

    setIsLoading(false);
  };

  const handleEmailVerified = () => {
    toast({
      title: 'Email verified!',
      description: 'Now add your phone number for SMS notifications',
    });
    setVerificationStep('phone');
  };

  const handleEmailSkipped = () => {
    setVerificationStep('phone');
  };

  const handlePhoneVerified = () => {
    toast({
      title: 'Phone verified!',
      description: 'You\'re all set to receive notifications',
    });
    navigate('/request-join');
  };

  const handlePhoneSkipped = () => {
    toast({
      title: 'Account created',
      description: 'You can add phone verification later in your profile',
    });
    navigate('/request-join');
  };

  // Show email verification step
  if (verificationStep === 'email' && newUserId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <EmailVerificationStep
          email={email}
          userId={newUserId}
          onVerified={handleEmailVerified}
          onSkip={handleEmailSkipped}
        />
      </div>
    );
  }

  // Show phone verification step
  if (verificationStep === 'phone' && newUserId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <PhoneVerificationStep
          userId={newUserId}
          onVerified={handlePhoneVerified}
          onSkip={handlePhoneSkipped}
        />
      </div>
    );
  }

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
          <CardTitle className="text-xl">Create an account</CardTitle>
          <CardDescription>Join your HOA community</CardDescription>
        </CardHeader>

        {/* Info about joining */}
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <h3 className="font-medium text-sm">3 ways to join your community:</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-secondary/10 rounded-lg flex-shrink-0">
                  <LinkIcon className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <span className="font-medium text-foreground">Invite Link</span>
                  <p className="text-xs">Click a link sent by your HOA admin</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-secondary/10 rounded-lg flex-shrink-0">
                  <QrCode className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <span className="font-medium text-foreground">Scan QR Code</span>
                  <p className="text-xs">Scan a code posted by your community</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-secondary/10 rounded-lg flex-shrink-0">
                  <Search className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <span className="font-medium text-foreground">Search & Request</span>
                  <p className="text-xs">Create an account, then search for your HOA and request to join</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-0">
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
