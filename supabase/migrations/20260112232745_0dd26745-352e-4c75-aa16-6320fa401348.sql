-- Add unique constraint for one resident per property (hoa_id + house_number + street_name + unit_number)
-- unit_number handles multi-family units/apartments
CREATE UNIQUE INDEX idx_profiles_unique_property 
ON public.profiles (hoa_id, house_number, street_name, COALESCE(unit_number, ''))
WHERE hoa_id IS NOT NULL AND house_number IS NOT NULL AND street_name IS NOT NULL;

-- Also add unique constraint to resident_invites to prevent duplicate invites for same address
CREATE UNIQUE INDEX idx_resident_invites_unique_address
ON public.resident_invites (hoa_id, house_number, street_name, COALESCE(email, ''))
WHERE used_by IS NULL;

-- Add check on join_requests to prevent duplicate pending requests for same address
CREATE UNIQUE INDEX idx_join_requests_unique_pending
ON public.join_requests (hoa_id, house_number, street_name, user_id)
WHERE status = 'pending';