-- Drop and recreate the directory_profiles view with security_invoker enabled
-- This ensures the view respects RLS policies on the underlying profiles table
DROP VIEW IF EXISTS public.directory_profiles;

CREATE VIEW public.directory_profiles
WITH (security_invoker=on) AS
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

-- Add a comment explaining the security model
COMMENT ON VIEW public.directory_profiles IS 'Secure view of profiles for directory display. Uses security_invoker to respect RLS policies on the profiles table.';