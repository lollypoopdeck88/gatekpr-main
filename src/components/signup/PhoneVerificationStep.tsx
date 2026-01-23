import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Phone, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PhoneVerificationStepProps {
  userId: string;
  onVerified: () => void;
  onSkip: () => void;
}

export function PhoneVerificationStep({ userId, onVerified, onSkip }: PhoneVerificationStepProps) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const { toast } = useToast();

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const getDigitsOnly = (formatted: string) => {
    return formatted.replace(/\D/g, '');
  };

  const sendVerificationCode = async () => {
    const digits = getDigitsOnly(phone);
    if (digits.length !== 10) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter a valid 10-digit phone number',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      // First update the profile with the phone number
      await supabase
        .from('profiles')
        .update({ phone: `+1${digits}` })
        .eq('user_id', userId);

      const { data, error } = await supabase.functions.invoke('send-verification-code', {
        body: { userId, type: 'phone', destination: `+1${digits}` },
      });

      if (error) throw error;

      setCodeSent(true);
      toast({
        title: 'Verification code sent',
        description: `A 6-digit code has been sent to ${phone}`,
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
        body: { userId, type: 'phone', code },
      });

      if (error) throw error;

      if (data?.verified) {
        toast({
          title: 'Phone verified!',
          description: 'Your phone number has been successfully verified.',
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
            <Phone className="h-8 w-8 text-secondary" />
          </div>
        </div>
        <CardTitle className="text-xl">Add Your Phone Number</CardTitle>
        <CardDescription>
          Verify your phone to receive SMS notifications about important community updates
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!codeSent ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 555-5555"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={14}
              />
              <p className="text-xs text-muted-foreground">US phone numbers only</p>
            </div>
            
            <Button
              onClick={sendVerificationCode}
              className="w-full"
              disabled={isSending || getDigitsOnly(phone).length !== 10}
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Send Verification Code
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Code sent to {phone}
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
                'Verify Phone'
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={() => { setCodeSent(false); setCode(''); }}
              className="w-full"
            >
              Change Phone Number
            </Button>
          </div>
        )}

        <div className="pt-2 border-t">
          <Button
            variant="link"
            onClick={onSkip}
            className="w-full text-muted-foreground"
          >
            Skip for now (you can add later in profile)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
