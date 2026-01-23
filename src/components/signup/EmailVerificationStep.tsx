import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EmailVerificationStepProps {
  email: string;
  userId: string;
  onVerified: () => void;
  onSkip: () => void;
}

export function EmailVerificationStep({ email, userId, onVerified, onSkip }: EmailVerificationStepProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const { toast } = useToast();

  const sendVerificationCode = async () => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-code', {
        body: { userId, type: 'email', destination: email },
      });

      if (error) throw error;

      setCodeSent(true);
      toast({
        title: 'Verification code sent',
        description: `A 6-digit code has been sent to ${email}`,
      });
    } catch (error: any) {
      toast({
        title: 'Failed to send code',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Please enter the 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-code', {
        body: { userId, type: 'email', code },
      });

      if (error) throw error;

      if (data?.verified) {
        toast({
          title: 'Email verified!',
          description: 'Your email has been successfully verified.',
        });
        onVerified();
      } else {
        toast({
          title: 'Invalid code',
          description: 'The code you entered is incorrect or expired.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-secondary/10">
            <Mail className="h-8 w-8 text-secondary" />
          </div>
        </div>
        <CardTitle className="text-xl">Verify Your Email</CardTitle>
        <CardDescription>
          We'll send a verification code to <strong>{email}</strong>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!codeSent ? (
          <Button
            onClick={sendVerificationCode}
            className="w-full"
            disabled={isSending}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Verification Code
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Code sent to {email}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="code">Enter 6-digit code</Label>
              <Input
                id="code"
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
            </div>

            <Button
              onClick={verifyCode}
              className="w-full"
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Email'
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={sendVerificationCode}
              className="w-full"
              disabled={isSending}
            >
              {isSending ? 'Sending...' : 'Resend Code'}
            </Button>
          </div>
        )}

        <div className="pt-2 border-t">
          <Button
            variant="link"
            onClick={onSkip}
            className="w-full text-muted-foreground"
          >
            Skip for now (you can verify later)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
