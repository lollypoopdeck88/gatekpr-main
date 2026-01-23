-- Create notification_logs table to track all sent notifications
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hoa_id UUID NOT NULL REFERENCES public.hoas(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'sms', 'in_app')),
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  error_message TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view logs for their HOA
CREATE POLICY "Admins can view notification logs for their HOA"
ON public.notification_logs
FOR SELECT
USING (
  hoa_id = public.get_user_hoa_id(auth.uid()) 
  AND public.has_role(auth.uid(), 'admin')
);

-- Super admins can view all logs
CREATE POLICY "Super admins can view all notification logs"
ON public.notification_logs
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- System can insert logs (via service role in edge functions)
CREATE POLICY "Service role can insert notification logs"
ON public.notification_logs
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notification_logs_hoa_id ON public.notification_logs(hoa_id);
CREATE INDEX idx_notification_logs_recipient_id ON public.notification_logs(recipient_id);
CREATE INDEX idx_notification_logs_created_at ON public.notification_logs(created_at DESC);
CREATE INDEX idx_notification_logs_status ON public.notification_logs(status);