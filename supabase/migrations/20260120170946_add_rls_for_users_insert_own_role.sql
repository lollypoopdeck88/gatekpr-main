CREATE POLICY "Users can insert their own role" ON public.user_roles 
FOR INSERT WITH CHECK (user_id = auth.uid());