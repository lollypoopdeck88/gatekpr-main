-- Add actor_name and actor_email columns to audit_logs table
ALTER TABLE audit_logs 
ADD COLUMN actor_name TEXT,
ADD COLUMN actor_email TEXT;

-- Update existing records with actor information from profiles
UPDATE audit_logs 
SET 
  actor_name = profiles.name,
  actor_email = profiles.email
FROM profiles 
WHERE audit_logs.actor_id = profiles.user_id;
