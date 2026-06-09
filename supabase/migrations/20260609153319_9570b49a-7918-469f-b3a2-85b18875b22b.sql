-- Trainers can only update their own clients AND cannot reassign them to another trainer
DROP POLICY IF EXISTS "trainer update own clients" ON public.clients;
CREATE POLICY "trainer update own clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);
