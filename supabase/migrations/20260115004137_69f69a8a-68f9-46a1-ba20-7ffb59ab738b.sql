-- Fix: Recreate directory_profiles view with SECURITY INVOKER
-- This ensures the view respects RLS policies of the querying user

DROP VIEW IF EXISTS public.directory_profiles;

CREATE VIEW public.directory_profiles
  WITH (security_invoker = on)
  AS
SELECT 
  id,
  user_id,
  hoa_id,
  name,
  unit_number,
  house_number,
  street_name,
  avatar_url,
  status
FROM public.profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.directory_profiles TO authenticated;

COMMENT ON VIEW public.directory_profiles IS 'Restricted view of profiles for resident directory - excludes sensitive contact info. Uses security_invoker to respect RLS.';