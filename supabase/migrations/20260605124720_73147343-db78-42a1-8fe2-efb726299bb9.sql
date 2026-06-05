
CREATE POLICY "receptionist view all clients" ON public.clients FOR SELECT USING (public.has_role(auth.uid(), 'receptionist'));
CREATE POLICY "receptionist view all payments" ON public.payments FOR SELECT USING (public.has_role(auth.uid(), 'receptionist'));
CREATE POLICY "receptionist insert payments" ON public.payments FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'receptionist'));
CREATE POLICY "receptionist view all attendance" ON public.attendance FOR SELECT USING (public.has_role(auth.uid(), 'receptionist'));
CREATE POLICY "receptionist insert attendance" ON public.attendance FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'receptionist'));
