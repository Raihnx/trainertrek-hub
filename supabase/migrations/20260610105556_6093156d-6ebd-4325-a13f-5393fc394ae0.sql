
-- ===== clients =====
DROP POLICY IF EXISTS "receptionist update clients" ON public.clients;
CREATE POLICY "receptionist update clients" ON public.clients
  FOR UPDATE USING (has_role(auth.uid(),'receptionist') AND has_permission(auth.uid(),'clients.edit'))
  WITH CHECK (has_role(auth.uid(),'receptionist') AND has_permission(auth.uid(),'clients.edit'));

CREATE POLICY "receptionist insert clients" ON public.clients
  FOR INSERT WITH CHECK (has_role(auth.uid(),'receptionist') AND has_permission(auth.uid(),'clients.create'));

CREATE POLICY "receptionist delete clients" ON public.clients
  FOR DELETE USING (has_role(auth.uid(),'receptionist') AND has_permission(auth.uid(),'clients.delete'));

DROP POLICY IF EXISTS "trainer insert own clients" ON public.clients;
CREATE POLICY "trainer insert own clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = trainer_id AND has_permission(auth.uid(),'clients.create'));

DROP POLICY IF EXISTS "trainer update own clients" ON public.clients;
CREATE POLICY "trainer update own clients" ON public.clients
  FOR UPDATE USING (auth.uid() = trainer_id AND has_permission(auth.uid(),'clients.edit'))
  WITH CHECK (auth.uid() = trainer_id AND has_permission(auth.uid(),'clients.edit'));

DROP POLICY IF EXISTS "trainer delete own clients" ON public.clients;
CREATE POLICY "trainer delete own clients" ON public.clients
  FOR DELETE USING (auth.uid() = trainer_id AND has_permission(auth.uid(),'clients.delete'));

-- ===== payments =====
DROP POLICY IF EXISTS "receptionist insert payments" ON public.payments;
CREATE POLICY "receptionist insert payments" ON public.payments
  FOR INSERT WITH CHECK (
    has_role(auth.uid(),'receptionist')
    AND has_permission(auth.uid(),'payments.create')
    AND EXISTS (SELECT 1 FROM clients c WHERE c.id = payments.client_id AND c.trainer_id = payments.trainer_id)
  );

DROP POLICY IF EXISTS "trainer insert own payments" ON public.payments;
CREATE POLICY "trainer insert own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = trainer_id AND has_permission(auth.uid(),'payments.create'));

-- ===== packages =====
DROP POLICY IF EXISTS "trainer insert own packages" ON public.packages;
CREATE POLICY "trainer insert own packages" ON public.packages
  FOR INSERT WITH CHECK (auth.uid() = trainer_id AND has_permission(auth.uid(),'memberships.manage'));

DROP POLICY IF EXISTS "trainer update own packages" ON public.packages;
CREATE POLICY "trainer update own packages" ON public.packages
  FOR UPDATE USING (auth.uid() = trainer_id AND has_permission(auth.uid(),'memberships.manage'));

DROP POLICY IF EXISTS "trainer delete own packages" ON public.packages;
CREATE POLICY "trainer delete own packages" ON public.packages
  FOR DELETE USING (auth.uid() = trainer_id AND has_permission(auth.uid(),'memberships.manage'));

-- ===== attendance =====
DROP POLICY IF EXISTS "receptionist insert attendance" ON public.attendance;
CREATE POLICY "receptionist insert attendance" ON public.attendance
  FOR INSERT WITH CHECK (
    has_role(auth.uid(),'receptionist')
    AND has_permission(auth.uid(),'attendance.mark')
    AND EXISTS (SELECT 1 FROM clients c WHERE c.id = attendance.client_id AND c.trainer_id = attendance.trainer_id)
  );

DROP POLICY IF EXISTS "trainer insert own attendance" ON public.attendance;
CREATE POLICY "trainer insert own attendance" ON public.attendance
  FOR INSERT WITH CHECK (auth.uid() = trainer_id AND has_permission(auth.uid(),'attendance.mark'));

DROP POLICY IF EXISTS "trainer update own attendance" ON public.attendance;
CREATE POLICY "trainer update own attendance" ON public.attendance
  FOR UPDATE USING (auth.uid() = trainer_id AND has_permission(auth.uid(),'attendance.mark'));

DROP POLICY IF EXISTS "trainer delete own attendance" ON public.attendance;
CREATE POLICY "trainer delete own attendance" ON public.attendance
  FOR DELETE USING (auth.uid() = trainer_id AND has_permission(auth.uid(),'attendance.mark'));

-- Receptionist needs attendance.mark by default so existing flow keeps working
INSERT INTO public.role_permissions (role, permission_key)
VALUES ('receptionist','attendance.mark')
ON CONFLICT DO NOTHING;
