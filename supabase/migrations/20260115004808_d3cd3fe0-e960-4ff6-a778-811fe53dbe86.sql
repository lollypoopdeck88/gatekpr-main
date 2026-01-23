-- =========================================
-- Violations Management System
-- =========================================

-- Violation categories enum-like table for flexibility
CREATE TABLE public.violation_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hoa_id UUID NOT NULL REFERENCES public.hoas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_fine_amount INTEGER DEFAULT 0, -- in cents
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hoa_id, name)
);

-- Main violations table
CREATE TABLE public.violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hoa_id UUID NOT NULL REFERENCES public.hoas(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.violation_categories(id) ON DELETE SET NULL,
  
  -- Violation details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  observed_at TIMESTAMPTZ NOT NULL,
  
  -- AI-generated notice content
  notice_content TEXT,
  ai_generated BOOLEAN DEFAULT false,
  ai_disclaimer_shown BOOLEAN DEFAULT false,
  
  -- Fine info
  fine_amount INTEGER DEFAULT 0, -- in cents
  fine_due_date DATE,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'acknowledged', 'disputed', 'resolved', 'waived')),
  
  -- Timestamps
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  
  -- Resolution
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Violation evidence/attachments
CREATE TABLE public.violation_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id UUID NOT NULL REFERENCES public.violations(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Violation acknowledgment/response from resident
CREATE TABLE public.violation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id UUID NOT NULL REFERENCES public.violations(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES auth.users(id),
  response_type TEXT NOT NULL CHECK (response_type IN ('acknowledge', 'dispute', 'request_extension')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI document generation requests (for audit trail)
CREATE TABLE public.ai_document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hoa_id UUID NOT NULL REFERENCES public.hoas(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('violation_notice', 'meeting_minutes', 'bylaws_recommendation', 'inquiry_response')),
  input_context JSONB NOT NULL,
  generated_content TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.violation_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violation_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_document_requests ENABLE ROW LEVEL SECURITY;

-- =========================================
-- RLS Policies for Violation Categories
-- =========================================
CREATE POLICY "Admins can manage violation categories"
ON public.violation_categories FOR ALL
TO authenticated
USING (
  (hoa_id = public.get_user_hoa_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role))
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  (hoa_id = public.get_user_hoa_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role))
  OR public.is_super_admin(auth.uid())
);

-- =========================================
-- RLS Policies for Violations
-- =========================================

-- Admins can view all violations in their HOA
CREATE POLICY "Admins can view all violations in their HOA"
ON public.violations FOR SELECT
TO authenticated
USING (
  hoa_id = public.get_user_hoa_id(auth.uid()) AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()))
);

-- Residents can only view their own violations
CREATE POLICY "Residents can view their own violations"
ON public.violations FOR SELECT
TO authenticated
USING (
  resident_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND status != 'draft' -- Don't show drafts to residents
);

-- Admins can create violations
CREATE POLICY "Admins can create violations"
ON public.violations FOR INSERT
TO authenticated
WITH CHECK (
  hoa_id = public.get_user_hoa_id(auth.uid()) AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()))
);

-- Admins can update violations
CREATE POLICY "Admins can update violations"
ON public.violations FOR UPDATE
TO authenticated
USING (
  hoa_id = public.get_user_hoa_id(auth.uid()) AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()))
);

-- Admins can delete draft violations
CREATE POLICY "Admins can delete draft violations"
ON public.violations FOR DELETE
TO authenticated
USING (
  hoa_id = public.get_user_hoa_id(auth.uid()) AND
  status = 'draft' AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()))
);

-- =========================================
-- RLS Policies for Violation Evidence
-- =========================================
CREATE POLICY "Admins can manage violation evidence"
ON public.violation_evidence FOR ALL
TO authenticated
USING (
  violation_id IN (
    SELECT id FROM public.violations 
    WHERE hoa_id = public.get_user_hoa_id(auth.uid())
  ) AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()))
)
WITH CHECK (
  violation_id IN (
    SELECT id FROM public.violations 
    WHERE hoa_id = public.get_user_hoa_id(auth.uid())
  ) AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()))
);

-- Residents can view evidence for their own violations
CREATE POLICY "Residents can view evidence for their violations"
ON public.violation_evidence FOR SELECT
TO authenticated
USING (
  violation_id IN (
    SELECT id FROM public.violations 
    WHERE resident_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND status != 'draft'
  )
);

-- =========================================
-- RLS Policies for Violation Responses
-- =========================================
CREATE POLICY "Admins can view all responses in their HOA"
ON public.violation_responses FOR SELECT
TO authenticated
USING (
  violation_id IN (
    SELECT id FROM public.violations 
    WHERE hoa_id = public.get_user_hoa_id(auth.uid())
  ) AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()))
);

-- Residents can view and create responses to their own violations
CREATE POLICY "Residents can view their own responses"
ON public.violation_responses FOR SELECT
TO authenticated
USING (resident_id = auth.uid());

CREATE POLICY "Residents can respond to their own violations"
ON public.violation_responses FOR INSERT
TO authenticated
WITH CHECK (
  resident_id = auth.uid() AND
  violation_id IN (
    SELECT id FROM public.violations 
    WHERE resident_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND status = 'sent'
  )
);

-- =========================================
-- RLS Policies for AI Document Requests
-- =========================================
CREATE POLICY "Admins can manage AI document requests"
ON public.ai_document_requests FOR ALL
TO authenticated
USING (
  hoa_id = public.get_user_hoa_id(auth.uid()) AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()))
)
WITH CHECK (
  hoa_id = public.get_user_hoa_id(auth.uid()) AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()))
);

-- =========================================
-- Storage bucket for violation evidence
-- =========================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('violation-evidence', 'violation-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for violation evidence
CREATE POLICY "Admins can upload violation evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'violation-evidence' AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()))
);

CREATE POLICY "HOA members can view their violation evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'violation-evidence' AND
  (
    split_part(name, '/', 1) = (public.get_user_hoa_id(auth.uid()))::text
    OR public.is_super_admin(auth.uid())
  )
);

CREATE POLICY "Admins can delete violation evidence"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'violation-evidence' AND
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid()))
);

-- =========================================
-- Seed default violation categories
-- =========================================
-- These will be created per-HOA when needed

-- Updated_at trigger for violations
CREATE TRIGGER update_violations_updated_at
  BEFORE UPDATE ON public.violations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for violations (residents need live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.violations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.violation_responses;
