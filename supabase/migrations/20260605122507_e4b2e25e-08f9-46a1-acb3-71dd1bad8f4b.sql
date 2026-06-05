
-- 1. permissions catalog
CREATE TABLE public.permissions (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read permissions"
  ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage permissions"
  ON public.permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. role default permissions
CREATE TABLE public.role_permissions (
  role public.app_role NOT NULL,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, permission_key)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read role permissions"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage role permissions"
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. per-user permission overrides
CREATE TABLE public.user_permissions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  granted boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own permissions"
  ON public.user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage user permissions"
  ON public.user_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. effective permission check
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_override boolean;
  v_role public.app_role;
BEGIN
  -- admins always allowed
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin') THEN
    RETURN true;
  END IF;

  SELECT granted INTO v_override
  FROM public.user_permissions
  WHERE user_id = _user_id AND permission_key = _key;
  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id AND rp.permission_key = _key
  );
END;
$$;

-- 5. seed permissions catalog
INSERT INTO public.permissions (key, label, description, category) VALUES
  ('clients.view',        'View clients',         'See the client list and profiles',         'Clients'),
  ('clients.create',      'Add clients',          'Create new client records',                'Clients'),
  ('clients.edit',        'Edit clients',         'Update existing client records',           'Clients'),
  ('clients.delete',      'Delete clients',       'Permanently remove client records',        'Clients'),
  ('payments.view',       'View payments',        'See payment history',                      'Payments'),
  ('payments.create',     'Record payments',      'Add new payments and collect dues',        'Payments'),
  ('attendance.mark',     'Mark attendance',      'Mark present / absent / freeze',           'Attendance'),
  ('attendance.view',     'View attendance',      'View attendance history and calendars',   'Attendance'),
  ('memberships.manage',  'Manage memberships',   'Create / extend / freeze memberships',     'Memberships'),
  ('trainers.assign',     'Assign trainers',      'Assign or change a client''s trainer',    'Trainers'),
  ('reports.view',        'View reports',         'Access revenue / attendance reports',      'Reports'),
  ('reports.export',      'Export reports',       'Download PDF / Excel exports',             'Reports'),
  ('incentives.view_own', 'View own incentives',  'View your own incentive earnings',         'Incentives'),
  ('incentives.view_all', 'View all incentives',  'View every trainer''s incentives',        'Incentives'),
  ('staff.manage',        'Manage staff',         'Create / edit / disable staff accounts',   'Staff'),
  ('settings.manage',     'Manage settings',      'Modify system settings',                   'Settings')
ON CONFLICT (key) DO NOTHING;

-- 6. seed role defaults
-- Admin gets everything (also short-circuited in has_permission)
INSERT INTO public.role_permissions (role, permission_key)
SELECT 'admin', key FROM public.permissions
ON CONFLICT DO NOTHING;

-- Receptionist
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('receptionist', 'clients.view'),
  ('receptionist', 'clients.create'),
  ('receptionist', 'clients.edit'),
  ('receptionist', 'payments.view'),
  ('receptionist', 'payments.create'),
  ('receptionist', 'memberships.manage'),
  ('receptionist', 'trainers.assign'),
  ('receptionist', 'attendance.view')
ON CONFLICT DO NOTHING;

-- Trainer
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('trainer', 'clients.view'),
  ('trainer', 'attendance.mark'),
  ('trainer', 'attendance.view'),
  ('trainer', 'incentives.view_own')
ON CONFLICT DO NOTHING;
