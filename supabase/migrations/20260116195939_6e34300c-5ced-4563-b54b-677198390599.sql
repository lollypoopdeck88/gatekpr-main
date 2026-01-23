-- Enable realtime for tables not yet in publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.space_reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.join_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_dismissals;