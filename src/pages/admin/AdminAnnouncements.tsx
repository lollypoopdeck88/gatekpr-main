import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Trash2, Mail, MessageSquare, Loader2, Bell, History } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Announcement, Profile } from '@/lib/types';
import { sendAnnouncementEmail } from '@/lib/emailService';
import { NotificationLogsViewer } from '@/components/admin/NotificationLogsViewer';
import { PollCreator } from '@/components/announcements/PollCreator';
import { PollResults } from '@/components/announcements/PollResults';

interface PollData {
  question: string;
  options: string[];
  allowMultiple: boolean;
  endsAt: string;
}

export default function AdminAnnouncements() {
  const { profile, user, effectiveHoaId } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', body: '' });
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [sendSmsNotification, setSendSmsNotification] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState('announcements');
  const [pollData, setPollData] = useState<PollData | null>(null);

  // Get all residents with their notification preferences
  const { data: residents } = useQuery({
    queryKey: ['residents-notifications', effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('email, phone, notify_by_email, notify_by_sms, email_verified, phone_verified')
        .eq('hoa_id', effectiveHoaId!)
        .eq('status', 'active');
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveHoaId,
  });

  const emailOptedInCount = residents?.filter(r => r.notify_by_email && r.email_verified).length || 0;
  const smsOptedInCount = residents?.filter(r => r.notify_by_sms && r.phone_verified && r.phone).length || 0;

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements', effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('hoa_id', effectiveHoaId!)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!effectiveHoaId,
  });

  const createAnnouncement = useMutation({
    mutationFn: async () => {
      setIsPublishing(true);
      
      // Create announcement
      const { data: announcement, error } = await supabase.from('announcements').insert({
        hoa_id: effectiveHoaId!,
        author_id: user!.id,
        title: formData.title,
        body: formData.body,
      }).select().single();
      if (error) throw error;

      // Create poll if enabled
      if (pollData && pollData.question && pollData.options.filter(o => o.trim()).length >= 2) {
        const { error: pollError } = await supabase.from('announcement_polls').insert({
          announcement_id: announcement.id,
          question: pollData.question,
          options: pollData.options.filter(o => o.trim()),
          allow_multiple: pollData.allowMultiple,
          ends_at: pollData.endsAt || null,
        });
        if (pollError) console.error('Failed to create poll:', pollError);
      }

      const results = { emailsSent: 0, emailsFailed: 0, smsSent: 0, smsFailed: 0 };

      // Send email notifications
      if (sendEmailNotification && residents) {
        const emailRecipients = residents
          .filter(r => r.notify_by_email && r.email_verified)
          .map(r => r.email);
        
        if (emailRecipients.length > 0) {
          const result = await sendAnnouncementEmail(
            emailRecipients,
            formData.title,
            formData.body,
            new Date().toISOString()
          );
          results.emailsSent = emailRecipients.length - result.failedEmails.length;
          results.emailsFailed = result.failedEmails.length;
        }
      }

      // Send SMS notifications
      if (sendSmsNotification && residents) {
        const smsRecipients = residents.filter(
          r => r.notify_by_sms && r.phone_verified && r.phone
        );
        
        for (const recipient of smsRecipients) {
          try {
            const { error: smsError } = await supabase.functions.invoke('send-sms', {
              body: {
                to: recipient.phone,
                message: `📢 ${formData.title}\n\n${formData.body.substring(0, 140)}${formData.body.length > 140 ? '...' : ''}`,
              },
            });
            if (smsError) {
              results.smsFailed++;
            } else {
              results.smsSent++;
            }
          } catch {
            results.smsFailed++;
          }
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      
      const messages: string[] = ['Announcement published!'];
      if (results.emailsSent > 0) {
        messages.push(`${results.emailsSent} email${results.emailsSent > 1 ? 's' : ''} sent`);
      }
      if (results.smsSent > 0) {
        messages.push(`${results.smsSent} SMS sent`);
      }
      toast.success(messages.join(' • '));

      if (results.emailsFailed > 0 || results.smsFailed > 0) {
        const failures: string[] = [];
        if (results.emailsFailed > 0) failures.push(`${results.emailsFailed} emails`);
        if (results.smsFailed > 0) failures.push(`${results.smsFailed} SMS`);
        toast.warning(`Failed to send: ${failures.join(', ')}`);
      }
      
      setIsDialogOpen(false);
      setFormData({ title: '', body: '' });
      setSendEmailNotification(true);
      setSendSmsNotification(false);
      setPollData(null);
      setIsPublishing(false);
    },
    onError: () => {
      toast.error('Failed to publish announcement');
      setIsPublishing(false);
    },
  });

  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement deleted');
    },
    onError: () => toast.error('Failed to delete announcement'),
  });

  return (
    <AppLayout adminOnly>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
            <p className="text-muted-foreground">Publish updates and track notifications</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Pool Closure Notice"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Message</Label>
                  <Textarea
                    id="body"
                    rows={5}
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="Write your announcement..."
                  />
                </div>
                
                <div className="border-t pt-4 space-y-3">
                  <p className="text-sm font-medium">Notification Options</p>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sendEmail"
                      checked={sendEmailNotification}
                      onCheckedChange={(checked) => setSendEmailNotification(checked === true)}
                    />
                    <Label htmlFor="sendEmail" className="flex items-center gap-2 text-sm cursor-pointer">
                      <Mail className="h-4 w-4" />
                      Send via Email
                      <span className="text-muted-foreground">
                        ({emailOptedInCount} opted-in)
                      </span>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sendSms"
                      checked={sendSmsNotification}
                      onCheckedChange={(checked) => setSendSmsNotification(checked === true)}
                      disabled={smsOptedInCount === 0}
                    />
                    <Label 
                      htmlFor="sendSms" 
                      className={`flex items-center gap-2 text-sm cursor-pointer ${smsOptedInCount === 0 ? 'text-muted-foreground' : ''}`}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Send via SMS
                      <span className="text-muted-foreground">
                        ({smsOptedInCount} opted-in)
                      </span>
                    </Label>
                  </div>
                </div>

                <PollCreator value={pollData} onChange={setPollData} />

                <Button
                  onClick={() => createAnnouncement.mutate()}
                  disabled={!formData.title || !formData.body || isPublishing}
                  className="w-full"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    'Publish'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="announcements" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Announcements
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Notification Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="announcements" className="mt-6">
            <div className="space-y-4">
              {isLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : announcements?.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No announcements yet. Create one to get started.
                  </CardContent>
                </Card>
              ) : (
                announcements?.map((announcement) => (
                  <Card key={announcement.id}>
                    <CardHeader className="flex flex-row items-start justify-between">
                      <div>
                        <CardTitle>{announcement.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(announcement.published_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAnnouncement.mutate(announcement.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground whitespace-pre-wrap">{announcement.body}</p>
                      <PollResults announcementId={announcement.id} />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="logs" className="mt-6">
            <NotificationLogsViewer />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
