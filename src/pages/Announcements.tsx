import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import type { Announcement } from '@/lib/types';
import { AnnouncementPoll } from '@/components/announcements/AnnouncementPoll';

export default function Announcements() {
  const { effectiveHoaId } = useAuth();

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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
          <p className="text-muted-foreground">Stay updated with community news</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          </div>
        ) : announcements && announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(announcement.published_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {announcement.body}
                  </p>
                  <AnnouncementPoll announcementId={announcement.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No announcements yet</p>
              <p className="text-sm text-muted-foreground">Check back later for updates from your HOA</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
