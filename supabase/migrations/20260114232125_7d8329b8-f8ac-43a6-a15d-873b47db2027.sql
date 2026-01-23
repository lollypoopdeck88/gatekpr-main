-- Add Stripe Connect account ID to hoas table
ALTER TABLE public.hoas 
ADD COLUMN IF NOT EXISTS stripe_connect_id text,
ADD COLUMN IF NOT EXISTS stripe_connect_status text DEFAULT 'not_connected',
ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_connect_onboarding_completed boolean DEFAULT false;

-- Create table to track resident dues payments and their transfer status
CREATE TABLE public.hoa_fund_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hoa_id uuid NOT NULL REFERENCES public.hoas(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  payment_request_id uuid REFERENCES public.payment_requests(id) ON DELETE SET NULL,
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  stripe_payout_id text,
  amount integer NOT NULL, -- Amount in cents
  platform_fee integer DEFAULT 0, -- Platform fee in cents
  net_amount integer NOT NULL, -- Amount to transfer after fees
  status text NOT NULL DEFAULT 'received', -- received, pending_transfer, transferred, payout_pending, payout_complete, failed
  received_at timestamptz NOT NULL DEFAULT now(),
  transferred_at timestamptz,
  payout_initiated_at timestamptz,
  payout_completed_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for quick lookups
CREATE INDEX idx_hoa_fund_transfers_hoa_id ON public.hoa_fund_transfers(hoa_id);
CREATE INDEX idx_hoa_fund_transfers_status ON public.hoa_fund_transfers(status);
CREATE INDEX idx_hoa_fund_transfers_stripe_payment ON public.hoa_fund_transfers(stripe_payment_intent_id);
CREATE INDEX idx_hoa_fund_transfers_stripe_transfer ON public.hoa_fund_transfers(stripe_transfer_id);

-- Enable Row Level Security
ALTER TABLE public.hoa_fund_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hoa_fund_transfers
-- Super admins can view all transfers
CREATE POLICY "Super admins can view all fund transfers"
ON public.hoa_fund_transfers
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- HOA admins can view their own HOA's transfers
CREATE POLICY "HOA admins can view their fund transfers"
ON public.hoa_fund_transfers
FOR SELECT
USING (
  hoa_id = public.get_user_hoa_id(auth.uid()) 
  AND public.has_role(auth.uid(), 'admin')
);

-- Create trigger for updated_at
CREATE TRIGGER update_hoa_fund_transfers_updated_at
BEFORE UPDATE ON public.hoa_fund_transfers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create view for fund summary by HOA
CREATE OR REPLACE VIEW public.hoa_fund_summary AS
SELECT 
  hoa_id,
  COUNT(*) FILTER (WHERE status = 'received') as pending_count,
  COALESCE(SUM(net_amount) FILTER (WHERE status = 'received'), 0) as pending_amount,
  COUNT(*) FILTER (WHERE status IN ('pending_transfer', 'transferred', 'payout_pending')) as in_transit_count,
  COALESCE(SUM(net_amount) FILTER (WHERE status IN ('pending_transfer', 'transferred', 'payout_pending')), 0) as in_transit_amount,
  COUNT(*) FILTER (WHERE status = 'payout_complete') as completed_count,
  COALESCE(SUM(net_amount) FILTER (WHERE status = 'payout_complete'), 0) as completed_amount,
  COALESCE(SUM(platform_fee), 0) as total_platform_fees
FROM public.hoa_fund_transfers
GROUP BY hoa_id;

-- Grant select on view
GRANT SELECT ON public.hoa_fund_summary TO authenticated;