-- Add profile_id foreign key to user_roles table for reliable joins
ALTER TABLE user_roles 
ADD COLUMN profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Update existing records to populate profile_id where profiles exist
UPDATE user_roles 
SET profile_id = profiles.id
FROM profiles 
WHERE user_roles.user_id = profiles.user_id;

-- Keep profile_id nullable to handle users without profiles (like super_admins)
-- This allows the join to work when profiles exist, and gracefully handle missing profiles
