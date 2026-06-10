
-- Helper: identify the primary (first-created) admin
CREATE OR REPLACE FUNCTION public.is_primary_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE role = 'admin'
      AND user_id = _user_id
      AND created_at = (SELECT MIN(created_at) FROM public.user_roles WHERE role = 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_primary_admin(uuid) TO authenticated, anon, service_role;

-- ===== clients =====
DROP POLICY IF EXISTS "admins manage all clients" ON public.clients;
CREATE POLICY "admins view all clients" ON public.clients
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "primary admin insert clients" ON public.clients
  FOR INSERT WITH CHECK (public.is_primary_admin(auth.uid()));
CREATE POLICY "primary admin update clients" ON public.clients
  FOR UPDATE USING (public.is_primary_admin(auth.uid())) WITH CHECK (public.is_primary_admin(auth.uid()));
CREATE POLICY "primary admin delete clients" ON public.clients
  FOR DELETE USING (public.is_primary_admin(auth.uid()));

-- ===== payments =====
DROP POLICY IF EXISTS "admins manage all payments" ON public.payments;
CREATE POLICY "admins view all payments" ON public.payments
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "primary admin insert payments" ON public.payments
  FOR INSERT WITH CHECK (public.is_primary_admin(auth.uid()));
CREATE POLICY "primary admin update payments" ON public.payments
  FOR UPDATE USING (public.is_primary_admin(auth.uid())) WITH CHECK (public.is_primary_admin(auth.uid()));
CREATE POLICY "primary admin delete payments" ON public.payments
  FOR DELETE USING (public.is_primary_admin(auth.uid()));

-- ===== packages =====
DROP POLICY IF EXISTS "admins manage all packages" ON public.packages;
CREATE POLICY "admins view all packages" ON public.packages
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "primary admin insert packages" ON public.packages
  FOR INSERT WITH CHECK (public.is_primary_admin(auth.uid()));
CREATE POLICY "primary admin update packages" ON public.packages
  FOR UPDATE USING (public.is_primary_admin(auth.uid())) WITH CHECK (public.is_primary_admin(auth.uid()));
CREATE POLICY "primary admin delete packages" ON public.packages
  FOR DELETE USING (public.is_primary_admin(auth.uid()));

-- ===== attendance =====
DROP POLICY IF EXISTS "admins manage all attendance" ON public.attendance;
CREATE POLICY "admins view all attendance" ON public.attendance
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "primary admin insert attendance" ON public.attendance
  FOR INSERT WITH CHECK (public.is_primary_admin(auth.uid()));
CREATE POLICY "primary admin update attendance" ON public.attendance
  FOR UPDATE USING (public.is_primary_admin(auth.uid())) WITH CHECK (public.is_primary_admin(auth.uid()));
CREATE POLICY "primary admin delete attendance" ON public.attendance
  FOR DELETE USING (public.is_primary_admin(auth.uid()));

-- ===== notifications =====
DROP POLICY IF EXISTS "admins manage all notifications" ON public.notifications;
CREATE POLICY "admins view all notifications" ON public.notifications
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "primary admin insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (public.is_primary_admin(auth.uid()));
CREATE POLICY "primary admin update notifications" ON public.notifications
  FOR UPDATE USING (public.is_primary_admin(auth.uid())) WITH CHECK (public.is_primary_admin(auth.uid()));
CREATE POLICY "primary admin delete notifications" ON public.notifications
  FOR DELETE USING (public.is_primary_admin(auth.uid()));

-- ===== user_roles (staff accounts) =====
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "primary admin manage roles" ON public.user_roles
  FOR ALL USING (public.is_primary_admin(auth.uid())) WITH CHECK (public.is_primary_admin(auth.uid()));

-- ===== role_permissions =====
DROP POLICY IF EXISTS "Admins manage role permissions" ON public.role_permissions;
CREATE POLICY "Admins view role permissions" ON public.role_permissions
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Primary admin manage role permissions" ON public.role_permissions
  FOR ALL USING (public.is_primary_admin(auth.uid())) WITH CHECK (public.is_primary_admin(auth.uid()));

-- ===== user_permissions =====
DROP POLICY IF EXISTS "Admins manage user permissions" ON public.user_permissions;
CREATE POLICY "Primary admin manage user permissions" ON public.user_permissions
  FOR ALL USING (public.is_primary_admin(auth.uid())) WITH CHECK (public.is_primary_admin(auth.uid()));

-- ===== permissions =====
DROP POLICY IF EXISTS "Admins manage permissions" ON public.permissions;
CREATE POLICY "Primary admin manage permissions" ON public.permissions
  FOR ALL USING (public.is_primary_admin(auth.uid())) WITH CHECK (public.is_primary_admin(auth.uid()));

-- ===== profiles (admin update) =====
DROP POLICY IF EXISTS "admins update all profiles" ON public.profiles;
CREATE POLICY "primary admin update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_primary_admin(auth.uid())) WITH CHECK (public.is_primary_admin(auth.uid()));
