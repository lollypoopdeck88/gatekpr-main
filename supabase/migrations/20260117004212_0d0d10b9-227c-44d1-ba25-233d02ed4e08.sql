-- Drop the overly permissive policy that exposes all invites to unauthenticated users
DROP POLICY IF EXISTS "Anyone can view invite by their token for signup" ON public.resident_invites;

-- Create a more restrictive policy that only allows admins/super admins to view invites
-- Unauthenticated users will use the validate-invite edge function instead
CREATE POLICY "Admins can view invites in their HOA"
ON public.resident_invites
FOR SELECT
USING (
  ((hoa_id = get_user_hoa_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role))
  OR is_super_admin(auth.uid())
);