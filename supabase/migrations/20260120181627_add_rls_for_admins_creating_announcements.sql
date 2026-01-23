CREATE POLICY "Admins can create announcements in their HOA or super_admin all" 
ON public.announcements 
FOR INSERT 
WITH CHECK (
  (
    hoa_id = public.get_user_hoa_id(auth.uid()) 
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
    AND author_id = auth.uid()
  ) 
  OR (
    public.is_super_admin(auth.uid()) 
    AND author_id = auth.uid()
  )
);