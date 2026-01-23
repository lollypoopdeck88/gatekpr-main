-- Add welcome_message column to hoas table for admin-customizable onboarding messages
ALTER TABLE public.hoas 
ADD COLUMN IF NOT EXISTS welcome_message TEXT;