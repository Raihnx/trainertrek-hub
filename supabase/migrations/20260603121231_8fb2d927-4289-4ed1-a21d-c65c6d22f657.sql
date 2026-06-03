
-- =========================
-- 1. Extend profiles
-- =========================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text;

-- Generic updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================
-- 2. packages
-- =========================
CREATE TABLE public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_days int NOT NULL CHECK (duration_days > 0),
  price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packages TO authenticated;
GRANT ALL ON public.packages TO service_role;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer view own packages" ON public.packages FOR SELECT TO authenticated USING (auth.uid() = trainer_id);
CREATE POLICY "trainer insert own packages" ON public.packages FOR INSERT TO authenticated WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "trainer update own packages" ON public.packages FOR UPDATE TO authenticated USING (auth.uid() = trainer_id);
CREATE POLICY "trainer delete own packages" ON public.packages FOR DELETE TO authenticated USING (auth.uid() = trainer_id);
CREATE TRIGGER packages_set_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_packages_trainer ON public.packages(trainer_id);

-- =========================
-- 3. clients
-- =========================
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  photo_url text,
  package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  package_name text,
  package_amount numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  total_days int NOT NULL DEFAULT 30,
  eligible_days int NOT NULL DEFAULT 0,
  freeze_days int NOT NULL DEFAULT 0,
  joining_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer view own clients" ON public.clients FOR SELECT TO authenticated USING (auth.uid() = trainer_id);
CREATE POLICY "trainer insert own clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "trainer update own clients" ON public.clients FOR UPDATE TO authenticated USING (auth.uid() = trainer_id);
CREATE POLICY "trainer delete own clients" ON public.clients FOR DELETE TO authenticated USING (auth.uid() = trainer_id);
CREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_clients_trainer ON public.clients(trainer_id);
CREATE INDEX idx_clients_expiry ON public.clients(expiry_date);

-- =========================
-- 4. attendance
-- =========================
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present','absent','freeze')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer view own attendance" ON public.attendance FOR SELECT TO authenticated USING (auth.uid() = trainer_id);
CREATE POLICY "trainer insert own attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "trainer update own attendance" ON public.attendance FOR UPDATE TO authenticated USING (auth.uid() = trainer_id);
CREATE POLICY "trainer delete own attendance" ON public.attendance FOR DELETE TO authenticated USING (auth.uid() = trainer_id);
CREATE INDEX idx_attendance_trainer_date ON public.attendance(trainer_id, date);
CREATE INDEX idx_attendance_client_date ON public.attendance(client_id, date);

-- Same-day-only rule: trainer can only insert/update attendance for CURRENT_DATE.
CREATE OR REPLACE FUNCTION public.enforce_attendance_same_day()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.date <> CURRENT_DATE THEN
    RAISE EXCEPTION 'Attendance can only be marked or changed on the same day (today: %)', CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER attendance_same_day_guard
BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.enforce_attendance_same_day();

-- =========================
-- 5. payments
-- =========================
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  paid_at timestamptz NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer view own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = trainer_id);
CREATE POLICY "trainer insert own payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "trainer update own payments" ON public.payments FOR UPDATE TO authenticated USING (auth.uid() = trainer_id);
CREATE POLICY "trainer delete own payments" ON public.payments FOR DELETE TO authenticated USING (auth.uid() = trainer_id);
CREATE INDEX idx_payments_trainer_paidat ON public.payments(trainer_id, paid_at);
CREATE INDEX idx_payments_client ON public.payments(client_id);

-- =========================
-- 6. notifications
-- =========================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('expiry','payment','package_ending','attendance')),
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = trainer_id);
CREATE POLICY "trainer insert own notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "trainer update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = trainer_id);
CREATE POLICY "trainer delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = trainer_id);
CREATE INDEX idx_notifications_trainer ON public.notifications(trainer_id, created_at DESC);
