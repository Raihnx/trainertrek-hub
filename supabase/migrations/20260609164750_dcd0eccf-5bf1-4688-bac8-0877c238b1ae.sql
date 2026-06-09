
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS working_hours integer[] NOT NULL DEFAULT ARRAY[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21];

DROP POLICY IF EXISTS "receptionists view all profiles" ON public.profiles;
CREATE POLICY "receptionists view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'receptionist'::public.app_role));
