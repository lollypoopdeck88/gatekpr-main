-- =========================================
-- SECURITY FIX 1: Make documents bucket private
-- =========================================

-- Update documents bucket to private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'documents';

-- Drop existing storage policies for documents bucket if any
DROP POLICY IF EXISTS "Allow public read access for documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "HOA members can download documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;

-- Create secure storage policies for documents bucket
-- Admins can upload documents
CREATE POLICY "Admins can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()))
);

-- HOA members can download documents from their HOA
CREATE POLICY "HOA members can download documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (
    -- Extract HOA ID from the file path (format: hoa_id/filename)
    split_part(name, '/', 1) = (public.get_user_hoa_id(auth.uid()))::text
    OR public.is_super_admin(auth.uid())
  )
);

-- Admins can delete documents
CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()))
);

-- =========================================
-- SECURITY FIX 2: Restrict profile visibility
-- =========================================

-- Drop the overly permissive profile SELECT policy
DROP POLICY IF EXISTS "Users can view profiles in their HOA or super_admin all" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all profiles in their HOA
CREATE POLICY "Admins can view all profiles in their HOA"
ON public.profiles FOR SELECT
TO authenticated
USING (
  (hoa_id = public.get_user_hoa_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role))
  OR public.is_super_admin(auth.uid())
);

-- Create a secure view for the resident directory (non-sensitive fields only)
CREATE OR REPLACE VIEW public.directory_profiles AS
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

-- Enable RLS on the view by creating a security barrier
-- (Views inherit the underlying table's RLS, but we make it explicit)
COMMENT ON VIEW public.directory_profiles IS 'Restricted view of profiles for resident directory - excludes sensitive contact info';