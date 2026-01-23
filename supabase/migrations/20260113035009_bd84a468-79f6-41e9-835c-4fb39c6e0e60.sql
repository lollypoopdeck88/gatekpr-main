-- Maintenance Requests table
CREATE TABLE public.maintenance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hoa_id UUID NOT NULL REFERENCES public.hoas(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('repair', 'key_request', 'common_area', 'landscaping', 'pool', 'parking', 'noise', 'other')),
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'emergency')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to UUID REFERENCES public.profiles(id),
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Maintenance Request Updates/Comments
CREATE TABLE public.maintenance_request_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  message TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  old_status TEXT,
  new_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_request_updates ENABLE ROW LEVEL SECURITY;

-- Maintenance Requests policies
CREATE POLICY "Residents can view their own requests"
ON public.maintenance_requests FOR SELECT
USING (resident_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all requests in their HOA"
ON public.maintenance_requests FOR SELECT
USING (
  hoa_id = public.get_user_hoa_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
);

CREATE POLICY "Residents can create requests in their HOA"
ON public.maintenance_requests FOR INSERT
WITH CHECK (
  resident_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND hoa_id = public.get_user_hoa_id(auth.uid())
);

CREATE POLICY "Admins can update requests in their HOA"
ON public.maintenance_requests FOR UPDATE
USING (
  hoa_id = public.get_user_hoa_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
);

-- Request Updates policies
CREATE POLICY "Residents can view updates on their requests"
ON public.maintenance_request_updates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_requests mr
    WHERE mr.id = request_id
    AND mr.resident_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND is_internal = false
  )
);

CREATE POLICY "Admins can view all updates in their HOA"
ON public.maintenance_request_updates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_requests mr
    WHERE mr.id = request_id
    AND mr.hoa_id = public.get_user_hoa_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  )
);

CREATE POLICY "Users can create updates on requests"
ON public.maintenance_request_updates FOR INSERT
WITH CHECK (
  author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.maintenance_requests mr
    WHERE mr.id = request_id
    AND (
      mr.resident_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      OR (
        mr.hoa_id = public.get_user_hoa_id(auth.uid())
        AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
      )
    )
  )
);

-- Indexes
CREATE INDEX idx_maintenance_requests_hoa ON public.maintenance_requests(hoa_id);
CREATE INDEX idx_maintenance_requests_resident ON public.maintenance_requests(resident_id);
CREATE INDEX idx_maintenance_requests_status ON public.maintenance_requests(status);
CREATE INDEX idx_maintenance_request_updates_request ON public.maintenance_request_updates(request_id);

-- Trigger for updated_at
CREATE TRIGGER update_maintenance_requests_updated_at
BEFORE UPDATE ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();