-- Create table for platform settings (super admin only)
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can read/write platform settings
CREATE POLICY "Super admins can read platform settings"
ON public.platform_settings FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert platform settings"
ON public.platform_settings FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update platform settings"
ON public.platform_settings FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Insert default transfer schedule setting
INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'transfer_schedule',
  '{"frequency": "manual", "day_of_week": 1, "enabled": true}'::jsonb,
  'Controls automatic fund transfer schedule. frequency: daily, weekly, or manual'
);