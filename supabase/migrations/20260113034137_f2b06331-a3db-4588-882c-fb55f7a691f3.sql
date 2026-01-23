-- Community Spaces table
CREATE TABLE public.community_spaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hoa_id UUID NOT NULL REFERENCES public.hoas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  location_notes TEXT,
  capacity INTEGER,
  pricing_info TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Availability rules for spaces (days and time windows)
CREATE TABLE public.space_availability_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.community_spaces(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Blackout dates for spaces
CREATE TABLE public.space_blackout_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.community_spaces(id) ON DELETE CASCADE,
  blackout_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Reservations
CREATE TABLE public.space_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.community_spaces(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reservation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.community_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_blackout_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_reservations ENABLE ROW LEVEL SECURITY;

-- Community Spaces policies
CREATE POLICY "Users can view spaces in their HOA"
ON public.community_spaces FOR SELECT
USING (hoa_id = public.get_user_hoa_id(auth.uid()));

CREATE POLICY "Admins can manage spaces"
ON public.community_spaces FOR ALL
USING (
  hoa_id = public.get_user_hoa_id(auth.uid()) 
  AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
);

-- Availability rules policies
CREATE POLICY "Users can view availability rules for their HOA spaces"
ON public.space_availability_rules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.community_spaces cs 
    WHERE cs.id = space_id 
    AND cs.hoa_id = public.get_user_hoa_id(auth.uid())
  )
);

CREATE POLICY "Admins can manage availability rules"
ON public.space_availability_rules FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.community_spaces cs 
    WHERE cs.id = space_id 
    AND cs.hoa_id = public.get_user_hoa_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  )
);

-- Blackout dates policies
CREATE POLICY "Users can view blackout dates for their HOA spaces"
ON public.space_blackout_dates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.community_spaces cs 
    WHERE cs.id = space_id 
    AND cs.hoa_id = public.get_user_hoa_id(auth.uid())
  )
);

CREATE POLICY "Admins can manage blackout dates"
ON public.space_blackout_dates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.community_spaces cs 
    WHERE cs.id = space_id 
    AND cs.hoa_id = public.get_user_hoa_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  )
);

-- Reservations policies
CREATE POLICY "Users can view their own reservations"
ON public.space_reservations FOR SELECT
USING (
  resident_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can view all reservations in their HOA"
ON public.space_reservations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.community_spaces cs 
    WHERE cs.id = space_id 
    AND cs.hoa_id = public.get_user_hoa_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  )
);

CREATE POLICY "Residents can create reservations for HOA spaces"
ON public.space_reservations FOR INSERT
WITH CHECK (
  resident_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.community_spaces cs 
    WHERE cs.id = space_id 
    AND cs.hoa_id = public.get_user_hoa_id(auth.uid())
  )
);

CREATE POLICY "Residents can cancel their own reservations"
ON public.space_reservations FOR UPDATE
USING (
  resident_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (
  resident_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND status = 'cancelled'
);

CREATE POLICY "Admins can manage all reservations in their HOA"
ON public.space_reservations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.community_spaces cs 
    WHERE cs.id = space_id 
    AND cs.hoa_id = public.get_user_hoa_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  )
);

-- Create indexes for performance
CREATE INDEX idx_community_spaces_hoa ON public.community_spaces(hoa_id);
CREATE INDEX idx_availability_rules_space ON public.space_availability_rules(space_id);
CREATE INDEX idx_blackout_dates_space ON public.space_blackout_dates(space_id);
CREATE INDEX idx_reservations_space ON public.space_reservations(space_id);
CREATE INDEX idx_reservations_resident ON public.space_reservations(resident_id);
CREATE INDEX idx_reservations_date ON public.space_reservations(reservation_date);
CREATE INDEX idx_reservations_status ON public.space_reservations(status);

-- Triggers for updated_at
CREATE TRIGGER update_community_spaces_updated_at
BEFORE UPDATE ON public.community_spaces
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_space_reservations_updated_at
BEFORE UPDATE ON public.space_reservations
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();