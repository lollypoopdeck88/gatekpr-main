-- Drop the overly permissive insert policy on notification_logs
-- The service role bypasses RLS anyway, so this policy only creates a security hole
DROP POLICY IF EXISTS "Service role can insert notification logs" ON public.notification_logs;