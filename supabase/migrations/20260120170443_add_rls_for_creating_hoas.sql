CREATE POLICY "Super_admins can create HOAs" ON public.hoas 
FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));