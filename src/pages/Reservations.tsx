import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, isBefore, startOfDay, addMonths, parse } from 'date-fns';
import { Building, CalendarIcon, Clock, MapPin, Users, DollarSign, CalendarPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddToCalendarButton } from '@/components/calendar/AddToCalendarButton';

interface CommunitySpace {
  id: string;
  name: string;
  description: string | null;
  location_notes: string | null;
  capacity: number | null;
  pricing_info: string | null;
  is_active: boolean;
}

interface AvailabilityRule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface Reservation {
  id: string;
  space_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  purpose: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  space?: { id: string; name: string; description: string | null; location_notes: string | null };
}

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  approved: 'default',
  denied: 'destructive',
  cancelled: 'outline',
};

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? '00' : '30';
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours < 12 ? 'AM' : 'PM';
  return {
    value: `${hours.toString().padStart(2, '0')}:${minutes}:00`,
    label: `${hour12}:${minutes} ${ampm}`,
  };
});

export default function Reservations() {
  const { profile, effectiveHoaId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSpace, setSelectedSpace] = useState<CommunitySpace | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState<Date>();
  const [bookingStart, setBookingStart] = useState('09:00:00');
  const [bookingEnd, setBookingEnd] = useState('10:00:00');
  const [bookingPurpose, setBookingPurpose] = useState('');

  const { data: spaces, isLoading: spacesLoading } = useQuery({
    queryKey: ['community-spaces', effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_spaces')
        .select('*')
        .eq('hoa_id', effectiveHoaId!)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as CommunitySpace[];
    },
    enabled: !!effectiveHoaId,
  });

  const { data: myReservations, isLoading: reservationsLoading } = useQuery({
    queryKey: ['my-reservations', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('space_reservations')
        .select(`
          *,
          space:community_spaces(id, name, description, location_notes)
        `)
        .eq('resident_id', profile!.id)
        .order('reservation_date', { ascending: false });
      if (error) throw error;
      return data as Reservation[];
    },
    enabled: !!profile?.id,
  });

  const { data: availabilityRules } = useQuery({
    queryKey: ['availability-rules', selectedSpace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('space_availability_rules')
        .select('*')
        .eq('space_id', selectedSpace!.id);
      if (error) throw error;
      return data as AvailabilityRule[];
    },
    enabled: !!selectedSpace?.id,
  });

  const { data: blackoutDates } = useQuery({
    queryKey: ['blackout-dates', selectedSpace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('space_blackout_dates')
        .select('blackout_date')
        .eq('space_id', selectedSpace!.id);
      if (error) throw error;
      return data.map((d) => d.blackout_date);
    },
    enabled: !!selectedSpace?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!bookingDate || !selectedSpace || !profile) throw new Error('Missing data');

      const { error } = await supabase.from('space_reservations').insert({
        space_id: selectedSpace.id,
        resident_id: profile.id,
        reservation_date: format(bookingDate, 'yyyy-MM-dd'),
        start_time: bookingStart,
        end_time: bookingEnd,
        purpose: bookingPurpose || null,
      });
      if (error) throw error;

      // Notify admins (we'll just log for now - in production you'd email admins)
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'reservation_submitted',
          to: profile.email, // Confirmation to resident
          hoaId: effectiveHoaId,
          recipientId: profile.id,
          data: {
            residentName: profile.name,
            spaceName: selectedSpace.name,
            date: format(bookingDate, 'EEEE, MMMM d, yyyy'),
            startTime: formatTime(bookingStart),
            endTime: formatTime(bookingEnd),
            purpose: bookingPurpose,
            appUrl: window.location.origin,
          },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      setIsBookingOpen(false);
      resetBookingForm();
      toast({ title: 'Reservation submitted! Awaiting admin approval.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error creating reservation', description: error.message, variant: 'destructive' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('space_reservations')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      toast({ title: 'Reservation cancelled' });
    },
    onError: (error: any) => {
      toast({ title: 'Error cancelling reservation', description: error.message, variant: 'destructive' });
    },
  });

  const resetBookingForm = () => {
    setBookingDate(undefined);
    setBookingStart('09:00:00');
    setBookingEnd('10:00:00');
    setBookingPurpose('');
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getReservationDates = (reservation: Reservation) => {
    const dateStr = reservation.reservation_date;
    const [startHours, startMinutes] = reservation.start_time.split(':').map(Number);
    const [endHours, endMinutes] = reservation.end_time.split(':').map(Number);
    
    const startDate = new Date(dateStr);
    startDate.setHours(startHours, startMinutes, 0, 0);
    
    const endDate = new Date(dateStr);
    endDate.setHours(endHours, endMinutes, 0, 0);
    
    return { startDate, endDate };
  };

  const isDateAvailable = (date: Date) => {
    // Check if past
    if (isBefore(date, startOfDay(new Date()))) return false;

    // Check blackout dates
    const dateStr = format(date, 'yyyy-MM-dd');
    if (blackoutDates?.includes(dateStr)) return false;

    // Check availability rules
    const dayOfWeek = date.getDay();
    return availabilityRules?.some((r) => r.day_of_week === dayOfWeek) ?? true;
  };

  const getAvailableTimeSlots = () => {
    if (!bookingDate || !availabilityRules) return TIME_OPTIONS;

    const dayOfWeek = bookingDate.getDay();
    const dayRules = availabilityRules.filter((r) => r.day_of_week === dayOfWeek);

    if (dayRules.length === 0) return TIME_OPTIONS;

    // Filter times that fall within availability windows
    return TIME_OPTIONS.filter((t) => {
      const timeValue = t.value;
      return dayRules.some((r) => timeValue >= r.start_time && timeValue < r.end_time);
    });
  };

  const openBookingDialog = (space: CommunitySpace) => {
    setSelectedSpace(space);
    resetBookingForm();
    setIsBookingOpen(true);
  };

  const upcomingReservations = myReservations?.filter(
    (r) => !isBefore(new Date(r.reservation_date), startOfDay(new Date())) && r.status !== 'cancelled'
  );
  const pastReservations = myReservations?.filter(
    (r) => isBefore(new Date(r.reservation_date), startOfDay(new Date())) || r.status === 'cancelled'
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Space Reservations</h1>
          <p className="text-muted-foreground">Browse and reserve community spaces</p>
        </div>

        <Tabs defaultValue="spaces">
          <TabsList>
            <TabsTrigger value="spaces">Available Spaces</TabsTrigger>
            <TabsTrigger value="my-reservations">My Reservations</TabsTrigger>
          </TabsList>

          <TabsContent value="spaces" className="mt-4">
            {spacesLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader><div className="h-6 bg-muted rounded w-3/4" /></CardHeader>
                    <CardContent><div className="h-24 bg-muted rounded" /></CardContent>
                  </Card>
                ))}
              </div>
            ) : spaces?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building className="h-12 w-12 text-muted-foreground mb-4" />
                  <h2 className="text-lg font-medium mb-2">No Spaces Available</h2>
                  <p className="text-muted-foreground text-center max-w-md">
                    There are no community spaces available for reservation at this time.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {spaces?.map((space) => (
                  <Card key={space.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{space.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {space.description || 'No description'}
                      </p>
                      <div className="space-y-2 text-sm mb-4">
                        {space.location_notes && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate">{space.location_notes}</span>
                          </div>
                        )}
                        {space.capacity && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>Up to {space.capacity} people</span>
                          </div>
                        )}
                        {space.pricing_info && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span className="truncate">{space.pricing_info}</span>
                          </div>
                        )}
                      </div>
                      <Button className="w-full" onClick={() => openBookingDialog(space)}>
                        <CalendarPlus className="h-4 w-4 mr-2" />
                        Reserve
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-reservations" className="mt-4 space-y-6">
            {reservationsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : myReservations?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CalendarPlus className="h-12 w-12 text-muted-foreground mb-4" />
                  <h2 className="text-lg font-medium mb-2">No Reservations</h2>
                  <p className="text-muted-foreground text-center max-w-md">
                    You haven't made any reservations yet. Browse available spaces to make your first reservation.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {upcomingReservations && upcomingReservations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Upcoming</h3>
                    <div className="space-y-3">
                      {upcomingReservations.map((reservation) => (
                        <Card key={reservation.id}>
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">{reservation.space?.name}</h4>
                                  <Badge variant={STATUS_COLORS[reservation.status]}>
                                    {reservation.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <CalendarIcon className="h-4 w-4" />
                                    {format(new Date(reservation.reservation_date), 'EEE, MMM d, yyyy')}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                                  </span>
                                </div>
                                {reservation.purpose && (
                                  <p className="text-sm text-muted-foreground mt-1">{reservation.purpose}</p>
                                )}
                                {reservation.admin_notes && (
                                  <p className="text-sm bg-muted p-2 rounded mt-2">
                                    <strong>Admin notes:</strong> {reservation.admin_notes}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {reservation.status === 'approved' && (() => {
                                  const { startDate, endDate } = getReservationDates(reservation);
                                  return (
                                    <AddToCalendarButton
                                      event={{
                                        title: `${reservation.space?.name} Reservation`,
                                        description: reservation.purpose || 'Community space reservation',
                                        location: reservation.space?.location_notes || '',
                                        startDate,
                                        endDate,
                                      }}
                                    />
                                  );
                                })()}
                                {reservation.status === 'pending' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm('Cancel this reservation?')) {
                                        cancelMutation.mutate(reservation.id);
                                      }
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {pastReservations && pastReservations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Past & Cancelled</h3>
                    <div className="space-y-3">
                      {pastReservations.map((reservation) => (
                        <Card key={reservation.id} className="opacity-60">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{reservation.space?.name}</h4>
                              <Badge variant={STATUS_COLORS[reservation.status]}>
                                {reservation.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="h-4 w-4" />
                                {format(new Date(reservation.reservation_date), 'EEE, MMM d, yyyy')}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Booking Dialog */}
        <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Reserve {selectedSpace?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !bookingDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {bookingDate ? format(bookingDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={bookingDate}
                      onSelect={setBookingDate}
                      disabled={(date) => !isDateAvailable(date) || date > addMonths(new Date(), 3)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Select value={bookingStart} onValueChange={setBookingStart}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableTimeSlots().map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>End Time</Label>
                  <Select value={bookingEnd} onValueChange={setBookingEnd}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableTimeSlots()
                        .filter((t) => t.value > bookingStart)
                        .map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Purpose (optional)</Label>
                <Textarea
                  value={bookingPurpose}
                  onChange={(e) => setBookingPurpose(e.target.value)}
                  placeholder="What will you be using this space for?"
                />
              </div>

              {selectedSpace?.pricing_info && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <strong>Pricing:</strong> {selectedSpace.pricing_info}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBookingOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !bookingDate}
              >
                {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}