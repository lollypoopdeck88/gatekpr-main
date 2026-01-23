import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { CalendarDays, Check, X, Clock, User } from 'lucide-react';

interface Reservation {
  id: string;
  space_id: string;
  resident_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  purpose: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  resident?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Props {
  spaceId: string;
  isAdmin?: boolean;
}

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  approved: 'default',
  denied: 'destructive',
  cancelled: 'outline',
};

export function ReservationCalendar({ spaceId, isAdmin = false }: Props) {
  const { profile, effectiveHoaId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(new Date());
  const [reviewingReservation, setReviewingReservation] = useState<Reservation | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['reservations', spaceId, format(month, 'yyyy-MM')],
    queryFn: async () => {
      const start = startOfMonth(month);
      const end = endOfMonth(addMonths(month, 1));
      
      let query = supabase
        .from('space_reservations')
        .select(`
          *,
          resident:profiles!space_reservations_resident_id_fkey(id, name, email)
        `)
        .eq('space_id', spaceId)
        .gte('reservation_date', format(start, 'yyyy-MM-dd'))
        .lte('reservation_date', format(end, 'yyyy-MM-dd'))
        .order('reservation_date')
        .order('start_time');

      if (!isAdmin) {
        query = query.eq('resident_id', profile?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Reservation[];
    },
    enabled: !!profile?.id,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'denied' }) => {
      const { error } = await supabase
        .from('space_reservations')
        .update({
          status,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
        })
        .eq('id', id);
      if (error) throw error;

      // Send notification email
      const reservation = reviewingReservation;
      if (reservation?.resident) {
        await supabase.functions.invoke('send-email', {
          body: {
            type: status === 'approved' ? 'reservation_approved' : 'reservation_denied',
            to: reservation.resident.email,
            hoaId: effectiveHoaId,
            recipientId: reservation.resident.id,
            data: {
              residentName: reservation.resident.name,
              date: format(new Date(reservation.reservation_date), 'EEEE, MMMM d, yyyy'),
              startTime: formatTime(reservation.start_time),
              endTime: formatTime(reservation.end_time),
              adminNotes,
              appUrl: window.location.origin,
            },
          },
        });
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setReviewingReservation(null);
      setAdminNotes('');
      toast({ title: `Reservation ${status}` });
    },
    onError: (error: any) => {
      toast({ title: 'Error updating reservation', description: error.message, variant: 'destructive' });
    },
  });

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Get reservations for selected date
  const selectedReservations = reservations?.filter((r) =>
    isSameDay(new Date(r.reservation_date), selectedDate)
  );

  // Dates with reservations for calendar highlighting
  const datesWithReservations = reservations?.map((r) => new Date(r.reservation_date)) || [];
  const pendingDates = reservations?.filter((r) => r.status === 'pending').map((r) => new Date(r.reservation_date)) || [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            month={month}
            onMonthChange={setMonth}
            modifiers={{
              hasReservation: datesWithReservations,
              pending: pendingDates,
            }}
            modifiersStyles={{
              hasReservation: {
                backgroundColor: 'hsl(var(--secondary))',
                fontWeight: 'bold',
              },
              pending: {
                border: '2px solid hsl(var(--primary))',
              },
            }}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : selectedReservations?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No reservations for this date
            </p>
          ) : (
            <div className="space-y-3">
              {selectedReservations?.map((reservation) => (
                <div
                  key={reservation.id}
                  className="p-4 border rounded-lg space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                      </span>
                    </div>
                    <Badge variant={STATUS_COLORS[reservation.status]}>
                      {reservation.status}
                    </Badge>
                  </div>

                  {isAdmin && reservation.resident && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{reservation.resident.name}</span>
                    </div>
                  )}

                  {reservation.purpose && (
                    <p className="text-sm text-muted-foreground">{reservation.purpose}</p>
                  )}

                  {isAdmin && reservation.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setReviewingReservation(reservation);
                          setAdminNotes('');
                        }}
                      >
                        Review
                      </Button>
                    </div>
                  )}

                  {reservation.admin_notes && (
                    <p className="text-sm bg-muted p-2 rounded">
                      <strong>Admin notes:</strong> {reservation.admin_notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewingReservation} onOpenChange={(open) => !open && setReviewingReservation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Reservation</DialogTitle>
          </DialogHeader>
          {reviewingReservation && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resident:</span>
                  <span className="font-medium">{reviewingReservation.resident?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">
                    {format(new Date(reviewingReservation.reservation_date), 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium">
                    {formatTime(reviewingReservation.start_time)} - {formatTime(reviewingReservation.end_time)}
                  </span>
                </div>
                {reviewingReservation.purpose && (
                  <div>
                    <span className="text-muted-foreground">Purpose:</span>
                    <p className="font-medium">{reviewingReservation.purpose}</p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Admin Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes for the resident..."
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setReviewingReservation(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => reviewMutation.mutate({ id: reviewingReservation!.id, status: 'denied' })}
              disabled={reviewMutation.isPending}
            >
              <X className="h-4 w-4 mr-1" />
              Deny
            </Button>
            <Button
              onClick={() => reviewMutation.mutate({ id: reviewingReservation!.id, status: 'approved' })}
              disabled={reviewMutation.isPending}
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}