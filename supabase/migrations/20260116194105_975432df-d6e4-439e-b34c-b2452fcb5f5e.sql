-- Create table to track dismissed/read notifications
CREATE TABLE public.notification_dismissals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_key TEXT NOT NULL,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_key)
);

-- Enable RLS
ALTER TABLE public.notification_dismissals ENABLE ROW LEVEL SECURITY;

-- Users can only see their own dismissals
CREATE POLICY "Users can view their own dismissals"
ON public.notification_dismissals
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own dismissals
CREATE POLICY "Users can create their own dismissals"
ON public.notification_dismissals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own dismissals (to "unread")
CREATE POLICY "Users can delete their own dismissals"
ON public.notification_dismissals
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX idx_notification_dismissals_user ON public.notification_dismissals(user_id);
CREATE INDEX idx_notification_dismissals_key ON public.notification_dismissals(user_id, notification_key);