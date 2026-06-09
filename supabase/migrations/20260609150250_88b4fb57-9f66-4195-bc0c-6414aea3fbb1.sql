
-- Tighten receptionist insert policies to require trainer_id matches the client's assigned trainer
DROP POLICY IF EXISTS "receptionist insert attendance" ON public.attendance;
CREATE POLICY "receptionist insert attendance"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'receptionist'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = attendance.client_id
      AND c.trainer_id = attendance.trainer_id
  )
);

DROP POLICY IF EXISTS "receptionist insert payments" ON public.payments;
CREATE POLICY "receptionist insert payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'receptionist'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = payments.client_id
      AND c.trainer_id = payments.trainer_id
  )
);

-- Restrict role_permissions read to admins or rows matching the user's own roles
DROP POLICY IF EXISTS "Authenticated can read role permissions" ON public.role_permissions;
CREATE POLICY "Users read own role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = role_permissions.role
  )
);
