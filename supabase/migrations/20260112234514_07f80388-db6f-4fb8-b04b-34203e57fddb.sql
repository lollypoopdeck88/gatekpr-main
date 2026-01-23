-- Create table for HOA subscriptions to Gatekpr platform
CREATE TABLE public.hoa_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hoa_id UUID NOT NULL REFERENCES public.hoas(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT NOT NULL,
  plan_name TEXT NOT NULL, -- 'starter', 'standard', 'plus', 'partner'
  status TEXT NOT NULL DEFAULT 'trialing', -- 'trialing', 'active', 'past_due', 'canceled', 'incomplete'
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(hoa_id)
);

-- Enable RLS
ALTER TABLE public.hoa_subscriptions ENABLE ROW LEVEL SECURITY;

-- Super admins can view all subscriptions (for billing management)
CREATE POLICY "Super admins can view all subscriptions"
ON public.hoa_subscriptions
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Super admins can manage subscriptions
CREATE POLICY "Super admins can manage all subscriptions"
ON public.hoa_subscriptions
FOR ALL
USING (is_super_admin(auth.uid()));

-- HOA admins can view their own subscription
CREATE POLICY "HOA admins can view their subscription"
ON public.hoa_subscriptions
FOR SELECT
USING (
  hoa_id = get_user_hoa_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Create trigger for updated_at
CREATE TRIGGER update_hoa_subscriptions_updated_at
BEFORE UPDATE ON public.hoa_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add billing_email to hoas table for subscription-related emails
ALTER TABLE public.hoas 
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;