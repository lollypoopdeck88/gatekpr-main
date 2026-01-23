import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, Mail, Phone, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'email' | 'phone';
  value: string;
  onVerified: () => void;
}

export function VerificationDialog({
  open,
  onOpenChange,
  type,
  value,
  onVerified,
}: VerificationDialogProps) {
  const [step, setStep] = useState<'send' | 'verify' | 'success'>('send');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-code', {
        body: { type, value },
      });

      if (error) throw error;

      toast.success(`Verification code sent to your ${type}`);
      setStep('verify');
    } catch (err: any) {
      console.error('Failed to send code:', err);
      toast.error(err.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-code', {
        body: { type, code },
      });

      if (error) throw error;

      setStep('success');
      toast.success(`${type === 'email' ? 'Email' : 'Phone'} verified successfully!`);
      
      setTimeout(() => {
        onVerified();
        onOpenChange(false);
        setStep('send');
        setCode('');
      }, 1500);
    } catch (err: any) {
      console.error('Failed to verify code:', err);
      toast.error(err.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setStep('send');
      setCode('');
    }
    onOpenChange(open);
  };

  const Icon = type === 'email' ? Mail : Phone;
  const maskedValue = type === 'email' 
    ? value.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : value.replace(/(\d{3})(\d+)(\d{2})/, '$1-***-**$3');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            Verify {type === 'email' ? 'Email' : 'Phone Number'}
          </DialogTitle>
          <DialogDescription>
            {step === 'send' && `We'll send a 6-digit code to ${maskedValue}`}
            {step === 'verify' && `Enter the code sent to ${maskedValue}`}
            {step === 'success' && 'Verification complete!'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-6 space-y-6">
          {step === 'send' && (
            <Button onClick={handleSendCode} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>Send Verification Code</>
              )}
            </Button>
          )}

          {step === 'verify' && (
            <>
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => setCode(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>

              <div className="flex flex-col gap-2 w-full">
                <Button onClick={handleVerifyCode} disabled={isLoading || code.length !== 6}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </Button>
                <Button variant="ghost" onClick={handleSendCode} disabled={isLoading}>
                  Resend Code
                </Button>
              </div>
            </>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-lg font-medium text-foreground">
                {type === 'email' ? 'Email' : 'Phone'} Verified!
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
