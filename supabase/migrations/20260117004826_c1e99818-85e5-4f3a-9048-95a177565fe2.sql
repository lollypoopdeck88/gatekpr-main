-- Create table to track verification attempts for rate limiting
CREATE TABLE public.verification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  verification_type text NOT NULL,
  failed_attempts integer DEFAULT 0,
  locked_until timestamp with time zone,
  last_attempt timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, verification_type)
);

-- Enable RLS
ALTER TABLE public.verification_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role should access this table (used by edge functions)
-- No policies needed as service role bypasses RLS

-- Add index for faster lookups
CREATE INDEX idx_verification_attempts_user_type ON public.verification_attempts(user_id, verification_type);

-- Add comment explaining purpose
COMMENT ON TABLE public.verification_attempts IS 'Tracks failed verification attempts to prevent brute force attacks. Used by verify-code edge function.';