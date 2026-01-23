-- Add a policy to allow users to view other profiles within their same HOA
-- This is needed for the resident directory feature
CREATE POLICY "Users can view profiles in their HOA for directory"
ON public.profiles
FOR SELECT
USING (hoa_id = get_user_hoa_id(auth.uid()));