import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Mail, MessageSquare, Search, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import type { Announcement } from '@/lib/types';

export default function NotificationHistory() {
  const { effectiveHoaId, effectiveProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['notification-history', effectiveHoaId],
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

  const filteredAnnouncements = announcements?.filter((announcement) => {
    const matchesSearch =
      announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      announcement.body.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getNotificationIcon = (index: number) => {
    // Simulate different notification types for visual variety
    const icons = [Bell, Mail, MessageSquare];
    const Icon = icons[index % icons.length];
    return <Icon className="h-4 w-4" />;
  };

  const getNotificationBadge = (index: number) => {
    const types = ['In-App', 'Email', 'SMS'];
    const colors = [
      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    ];
    return (
      <Badge variant="secondary" className={colors[index % colors.length]}>
        {types[index % types.length]}
      </Badge>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notification History</h1>
          <p className="text-muted-foreground">
            View all past announcements and notifications
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="emails">Emails</TabsTrigger>
            <TabsTrigger value="sms">SMS</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-secondary" />
              </div>
            ) : filteredAnnouncements && filteredAnnouncements.length > 0 ? (
              <div className="space-y-3">
                {filteredAnnouncements.map((announcement, index) => (
                  <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-muted">
                            {getNotificationIcon(index)}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">{announcement.title}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(announcement.published_at), 'MMM d, yyyy \'at\' h:mm a')}
                            </p>
                          </div>
                        </div>
                        {getNotificationBadge(index)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                        {announcement.body}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No notifications found</p>
                  <p className="text-sm text-muted-foreground">
                    {searchTerm ? 'Try a different search term' : 'Your notification history will appear here'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Notification Preferences Reminder */}
        {effectiveProfile && (!effectiveProfile.notify_by_email && !effectiveProfile.notify_by_sms) && (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
            <CardContent className="flex items-center gap-3 py-4">
              <Bell className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Enable Notifications
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  Go to your profile to enable email or SMS notifications for announcements.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
