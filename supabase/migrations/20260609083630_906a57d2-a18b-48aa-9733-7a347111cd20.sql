
-- 1. admin_audit_log: remove direct user insert; add SECURITY DEFINER writer
DROP POLICY IF EXISTS "users insert own audit entries" ON public.admin_audit_log;

CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action text,
  _target_type text DEFAULT NULL,
  _target_id text DEFAULT NULL,
  _target_label text DEFAULT NULL,
  _description text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_role text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT email, display_name INTO v_email, v_name
  FROM public.profiles WHERE id = v_uid;

  SELECT role::text INTO v_role
  FROM public.user_roles
  WHERE user_id = v_uid
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'receptionist' THEN 2 ELSE 3 END
  LIMIT 1;

  INSERT INTO public.admin_audit_log(
    actor_id, actor_email, actor_name, actor_role,
    action, target_type, target_id, target_label, description, metadata
  ) VALUES (
    v_uid, v_email, COALESCE(v_name, split_part(v_email,'@',1)), v_role,
    _action, _target_type, _target_id, _target_label, _description, COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_event(text, text, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, text, text, text, jsonb) TO authenticated;

-- 2. packages: explicit admin + receptionist read access
CREATE POLICY "admins manage all packages"
ON public.packages
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "receptionist view all packages"
ON public.packages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'receptionist'::app_role));

-- 3. avatars storage: restrict read to owner folder (signed URLs still work for sharing)
DROP POLICY IF EXISTS "Authenticated can read avatars" ON storage.objects;

CREATE POLICY "Users read own avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);
