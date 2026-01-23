-- Fix RLS policies for space-related tables to properly handle super admin HOA switching

-- Drop and recreate space_availability_rules policy
DROP POLICY IF EXISTS "Admins can manage availability rules" ON public.space_availability_rules;

CREATE POLICY "Admins can manage availability rules"
ON public.space_availability_rules FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.community_spaces cs 
    WHERE cs.id = space_id 
    AND (
      (cs.hoa_id = public.get_user_hoa_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role))
      OR public.is_super_admin(auth.uid())
      OR (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.profiles p ON p.user_id = ur.user_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'admin'::public.app_role
          AND p.hoa_id = cs.hoa_id
        )
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.community_spaces cs 
    WHERE cs.id = space_id 
    AND (
      (cs.hoa_id = public.get_user_hoa_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role))
      OR public.is_super_admin(auth.uid())
      OR (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.profiles p ON p.user_id = ur.user_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'admin'::public.app_role
          AND p.hoa_id = cs.hoa_id
        )
      )
    )
  )
);

-- Drop and recreate space_blackout_dates policy
DROP POLICY IF EXISTS "Admins can manage blackout dates" ON public.space_blackout_dates;

CREATE POLICY "Admins can manage blackout dates"
ON public.space_blackout_dates FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.community_spaces cs 
    WHERE cs.id = space_id 
    AND (
      (cs.hoa_id = public.get_user_hoa_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role))
      OR public.is_super_admin(auth.uid())
      OR (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.profiles p ON p.user_id = ur.user_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'admin'::public.app_role
          AND p.hoa_id = cs.hoa_id
        )
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.community_spaces cs 
    WHERE cs.id = space_id 
    AND (
      (cs.hoa_id = public.get_user_hoa_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role))
      OR public.is_super_admin(auth.uid())
      OR (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.profiles p ON p.user_id = ur.user_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'admin'::public.app_role
          AND p.hoa_id = cs.hoa_id
        )
      )
    )
  )
);

-- Drop and recreate space_reservations admin policy
DROP POLICY IF EXISTS "Admins can manage all reservations in their HOA" ON public.space_reservations;

CREATE POLICY "Admins can manage all reservations in their HOA"
ON public.space_reservations FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.community_spaces cs 
    WHERE cs.id = space_id 
    AND (
      (cs.hoa_id = public.get_user_hoa_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role))
      OR public.is_super_admin(auth.uid())
      OR (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.profiles p ON p.user_id = ur.user_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'admin'::public.app_role
          AND p.hoa_id = cs.hoa_id
        )
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.community_spaces cs 
    WHERE cs.id = space_id 
    AND (
      (cs.hoa_id = public.get_user_hoa_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role))
      OR public.is_super_admin(auth.uid())
      OR (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.profiles p ON p.user_id = ur.user_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'admin'::public.app_role
          AND p.hoa_id = cs.hoa_id
        )
      )
    )
  )
);
