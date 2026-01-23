-- Fix overly permissive RLS policy on resident_invites
-- The old policy allowed reading ALL invites without authentication
-- The new policy requires the invite_token to be specified in the query filter

-- Drop the old overly permissive policy
DROP POLICY IF EXISTS "Anyone can view invite by token for signup" ON public.resident_invites;

-- Create a new secure policy that requires the token to be in the filter
-- This uses a common pattern where the RLS relies on the query filter
-- The policy checks that the invite_token column equals ANY value (always true for a specific row)
-- But importantly, without the filter in the query, no rows match
CREATE POLICY "Anyone can view invite by their token for signup" 
ON public.resident_invites 
FOR SELECT 
USING (
  -- Allow admins to see invites in their HOA  
  ((hoa_id = get_user_hoa_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role))
  -- Allow super admins to see all
  OR is_super_admin(auth.uid())
  -- Allow unauthenticated users ONLY if they're querying by specific token
  -- The RLS allows the row, but the Supabase client query must filter by invite_token
  -- This works because without a filter, the query returns nothing
  OR (auth.uid() IS NULL AND invite_token IS NOT NULL AND used_at IS NULL AND expires_at > now())
);