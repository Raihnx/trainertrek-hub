
CREATE POLICY "receptionist update clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'receptionist'::app_role))
WITH CHECK (has_role(auth.uid(), 'receptionist'::app_role));

CREATE OR REPLACE FUNCTION public.list_assignable_trainers()
RETURNS TABLE (id uuid, display_name text, email text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.email, ur.role::text
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role IN ('trainer','admin')
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'receptionist'::app_role)
    )
  ORDER BY p.display_name;
$$;

REVOKE EXECUTE ON FUNCTION public.list_assignable_trainers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_assignable_trainers() TO authenticated;
