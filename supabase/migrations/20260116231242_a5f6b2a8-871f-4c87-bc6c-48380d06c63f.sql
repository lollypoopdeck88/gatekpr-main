-- Create announcement_polls table for poll configuration
CREATE TABLE public.announcement_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]', -- Array of option strings
  allow_multiple BOOLEAN NOT NULL DEFAULT false,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create announcement_votes table for individual votes
CREATE TABLE public.announcement_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.announcement_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  selected_options JSONB NOT NULL DEFAULT '[]', -- Array of selected option indices
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Enable RLS
ALTER TABLE public.announcement_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_votes ENABLE ROW LEVEL SECURITY;

-- Polls: anyone in the HOA can view polls
CREATE POLICY "Users can view polls for their HOA announcements"
ON public.announcement_polls
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.announcements a
    JOIN public.profiles p ON p.hoa_id = a.hoa_id
    WHERE a.id = announcement_id AND p.user_id = auth.uid()
  )
);

-- Polls: only admins can create/update/delete polls
CREATE POLICY "Admins can manage polls"
ON public.announcement_polls
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.announcements a
    WHERE a.id = announcement_id 
    AND public.has_role(auth.uid(), 'admin')
  )
);

-- Votes: users can view all votes (for results) in their HOA
CREATE POLICY "Users can view votes for their HOA polls"
ON public.announcement_votes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.announcement_polls ap
    JOIN public.announcements a ON a.id = ap.announcement_id
    JOIN public.profiles p ON p.hoa_id = a.hoa_id
    WHERE ap.id = poll_id AND p.user_id = auth.uid()
  )
);

-- Votes: users can insert their own vote
CREATE POLICY "Users can cast their vote"
ON public.announcement_votes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.announcement_polls ap
    JOIN public.announcements a ON a.id = ap.announcement_id
    JOIN public.profiles p ON p.hoa_id = a.hoa_id
    WHERE ap.id = poll_id AND p.user_id = auth.uid()
  )
);

-- Votes: users can update their own vote
CREATE POLICY "Users can update their vote"
ON public.announcement_votes
FOR UPDATE
USING (auth.uid() = user_id);

-- Votes: users can delete their own vote
CREATE POLICY "Users can delete their vote"
ON public.announcement_votes
FOR DELETE
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_announcement_polls_announcement_id ON public.announcement_polls(announcement_id);
CREATE INDEX idx_announcement_votes_poll_id ON public.announcement_votes(poll_id);
CREATE INDEX idx_announcement_votes_user_id ON public.announcement_votes(user_id);