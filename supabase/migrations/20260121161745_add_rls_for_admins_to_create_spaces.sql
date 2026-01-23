-- Fix RLS policy for community_spaces to properly handle super admin HOA switching
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage spaces" ON public.community_spaces;

-- Create updated policy that properly handles super admin HOA switching
CREATE POLICY "Admins can manage spaces"
ON public.community_spaces FOR ALL
TO authenticated
USING (
  (hoa_id = public.get_user_hoa_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role))
  OR public.is_super_admin(auth.uid())
  OR (
    -- Allow admins to manage spaces in HOAs where they have admin access
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
      AND p.hoa_id = community_spaces.hoa_id
    )
  )
)
WITH CHECK (
  (hoa_id = public.get_user_hoa_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role))
  OR public.is_super_admin(auth.uid())
  OR (
    -- Allow admins to create spaces in HOAs where they have admin access
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
      AND p.hoa_id = community_spaces.hoa_id
    )
  )
);
