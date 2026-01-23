import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Phone, Bell, CheckCircle2, AlertCircle, Smartphone, Calendar } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { VerificationDialog } from '@/components/verification/VerificationDialog';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface NotificationPreferencesProps {
  profile: {
    email: string;
    phone?: string | null;
    email_verified?: boolean | null;
    phone_verified?: boolean | null;
    notify_by_email?: boolean | null;
    notify_by_sms?: boolean | null;
    user_id: string;
  };
}

export function NotificationPreferences({ profile }: NotificationPreferencesProps) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [emailNotify, setEmailNotify] = useState(profile.notify_by_email ?? true);
  const [smsNotify, setSmsNotify] = useState(profile.notify_by_sms ?? false);
  const [digestFrequency, setDigestFrequency] = useState<string>('daily');
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verifyType, setVerifyType] = useState<'email' | 'phone'>('email');

  const {
    isSupported: pushSupported,
    permission: pushPermission,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    requestPermission,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    sendTestNotification,
  } = usePushNotifications();

  const handleToggleEmail = async (checked: boolean) => {
    if (checked && !profile.email_verified) {
      toast.error('Please verify your email first');
      return;
    }
    setEmailNotify(checked);
    await savePreferences(checked, smsNotify);
  };

  const handleToggleSms = async (checked: boolean) => {
    if (checked && !profile.phone) {
      toast.error('Please add a phone number first');
      return;
    }
    if (checked && !profile.phone_verified) {
      toast.error('Please verify your phone number first');
      return;
    }
    setSmsNotify(checked);
    await savePreferences(emailNotify, checked);
  };

  const handleTogglePush = async (checked: boolean) => {
    if (checked) {
      if (pushPermission === 'denied') {
        toast.error('Push notifications are blocked. Enable them in your browser settings.');
        return;
      }
      await subscribePush();
    } else {
      await unsubscribePush();
    }
  };

  const savePreferences = async (email: boolean, sms: boolean) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          notify_by_email: email,
          notify_by_sms: sms,
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;
      toast.success('Notification preferences saved');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (err) {
      console.error('Failed to save preferences:', err);
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const openVerification = (type: 'email' | 'phone') => {
    setVerifyType(type);
    setVerifyDialogOpen(true);
  };

  const handleVerified = () => {
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  const getPushStatusText = () => {
    if (!pushSupported) return 'Not supported in this browser';
    if (pushPermission === 'denied') return 'Blocked by browser';
    if (pushSubscribed) return 'Enabled';
    return 'Disabled';
  };

  const getPushStatusBadge = () => {
    if (!pushSupported || pushPermission === 'denied') {
      return (
        <Badge variant="outline" className="text-muted-foreground border-muted-foreground">
          <AlertCircle className="h-3 w-3 mr-1" />
          {!pushSupported ? 'Not Supported' : 'Blocked'}
        </Badge>
      );
    }
    if (pushSubscribed) {
      return (
        <Badge variant="outline" className="text-green-600 border-green-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Enabled
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-600">
        <AlertCircle className="h-3 w-3 mr-1" />
        Disabled
      </Badge>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose how you'd like to receive community updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="push-notify" className="text-base font-medium">
                  Push Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get instant alerts even when not in the app
                </p>
                <div className="flex items-center gap-2">
                  {getPushStatusBadge()}
                  {pushSubscribed && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-primary"
                      onClick={sendTestNotification}
                    >
                      Send test
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <Switch
              id="push-notify"
              checked={pushSubscribed}
              onCheckedChange={handleTogglePush}
              disabled={pushLoading || !pushSupported || pushPermission === 'denied'}
            />
          </div>

          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="email-notify" className="text-base font-medium">
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <div className="flex items-center gap-2">
                  {profile.email_verified ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <>
                      <Badge variant="outline" className="text-amber-600 border-amber-600">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Not Verified
                      </Badge>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-primary"
                        onClick={() => openVerification('email')}
                      >
                        Verify now
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Switch
              id="email-notify"
              checked={emailNotify}
              onCheckedChange={handleToggleEmail}
              disabled={isSaving || !profile.email_verified}
            />
          </div>

          {/* Email Digest */}
          {emailNotify && (
            <div className="flex items-center justify-between ml-8 pl-3 border-l-2 border-muted">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <Label htmlFor="digest-frequency" className="text-base font-medium">
                    Email Digest
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get a summary of pending items
                  </p>
                </div>
              </div>
              <Select value={digestFrequency} onValueChange={setDigestFrequency}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* SMS Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="sms-notify" className="text-base font-medium">
                  SMS Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  {profile.phone || 'No phone number added'}
                </p>
                {profile.phone && (
                  <div className="flex items-center gap-2">
                    {profile.phone_verified ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <>
                        <Badge variant="outline" className="text-amber-600 border-amber-600">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Not Verified
                        </Badge>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-primary"
                          onClick={() => openVerification('phone')}
                        >
                          Verify now
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Switch
              id="sms-notify"
              checked={smsNotify}
              onCheckedChange={handleToggleSms}
              disabled={isSaving || !profile.phone || !profile.phone_verified}
            />
          </div>
        </CardContent>
      </Card>

      <VerificationDialog
        open={verifyDialogOpen}
        onOpenChange={setVerifyDialogOpen}
        type={verifyType}
        value={verifyType === 'email' ? profile.email : (profile.phone || '')}
        onVerified={handleVerified}
      />
    </>
  );
}
