-- Add verification and notification preference columns to profiles

-- Email verification fields (Supabase Auth already handles email verification, but we track it explicitly)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verification_code TEXT,
ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP WITH TIME ZONE;

-- Phone verification fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verification_code TEXT,
ADD COLUMN IF NOT EXISTS phone_verification_expires_at TIMESTAMP WITH TIME ZONE;

-- Notification preferences (opt-in for email and SMS)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notify_by_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_by_sms BOOLEAN DEFAULT false;

-- Create index for quick lookups of opted-in users
CREATE INDEX IF NOT EXISTS idx_profiles_notification_prefs 
ON public.profiles(hoa_id, notify_by_email, notify_by_sms) 
WHERE status = 'active';