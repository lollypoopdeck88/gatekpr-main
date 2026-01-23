-- Drop the security definer view and recreate as invoker
DROP VIEW IF EXISTS public.hoa_fund_summary;

-- Recreate view with security_invoker = true (default in newer Postgres)
CREATE VIEW public.hoa_fund_summary 
WITH (security_invoker = true)
AS
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