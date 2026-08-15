CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  avatar_color TEXT NOT NULL DEFAULT 'teal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.room_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INT NOT NULL,
  year INT NOT NULL,
  rent_total NUMERIC NOT NULL DEFAULT 16000,
  cleaning_total NUMERIC NOT NULL DEFAULT 200,
  water_total NUMERIC NOT NULL DEFAULT 400,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (month, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_bills TO authenticated;
GRANT ALL ON public.room_bills TO service_role;
ALTER TABLE public.room_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "room_bills_all" ON public.room_bills FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.utility_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('electricity','gas')),
  reading_date DATE NOT NULL,
  reading_value NUMERIC NOT NULL,
  rate_per_unit NUMERIC NOT NULL,
  logged_by UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (type, reading_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.utility_readings TO authenticated;
GRANT ALL ON public.utility_readings TO service_role;
ALTER TABLE public.utility_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "readings_select" ON public.utility_readings FOR SELECT TO authenticated USING (true);
CREATE POLICY "readings_insert" ON public.utility_readings FOR INSERT TO authenticated WITH CHECK (logged_by = auth.uid());
CREATE POLICY "readings_update" ON public.utility_readings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  paid_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'other',
  receipt_url TEXT,
  split_mode TEXT NOT NULL DEFAULT 'equal',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "expenses_insert_own" ON public.expenses FOR INSERT TO authenticated WITH CHECK (paid_by = auth.uid());
CREATE POLICY "expenses_update_own" ON public.expenses FOR UPDATE TO authenticated USING (paid_by = auth.uid()) WITH CHECK (paid_by = auth.uid());
CREATE POLICY "expenses_delete_own" ON public.expenses FOR DELETE TO authenticated USING (paid_by = auth.uid());

CREATE TABLE public.expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses ON DELETE CASCADE,
  owed_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  amount_owed NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  requested_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_splits TO authenticated;
GRANT ALL ON public.expense_splits TO service_role;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "splits_select" ON public.expense_splits FOR SELECT TO authenticated USING (true);
CREATE POLICY "splits_insert" ON public.expense_splits FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_id AND e.paid_by = auth.uid()));
CREATE POLICY "splits_update_debtor" ON public.expense_splits FOR UPDATE TO authenticated USING (owed_by = auth.uid()) WITH CHECK (owed_by = auth.uid());
CREATE POLICY "splits_update_payer" ON public.expense_splits FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_id AND e.paid_by = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_id AND e.paid_by = auth.uid()));
CREATE POLICY "splits_delete_payer" ON public.expense_splits FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_id AND e.paid_by = auth.uid()));

CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notices TO authenticated;
GRANT ALL ON public.notices TO service_role;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notices_select" ON public.notices FOR SELECT TO authenticated USING (true);
CREATE POLICY "notices_insert_own" ON public.notices FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "notices_delete_own" ON public.notices FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  related_expense_id UUID REFERENCES public.expenses ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_select" ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "activity_insert_own" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_delete_own" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.monthly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INT NOT NULL,
  year INT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (month, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_summaries TO authenticated;
GRANT ALL ON public.monthly_summaries TO service_role;
ALTER TABLE public.monthly_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "summaries_all" ON public.monthly_summaries FOR ALL TO authenticated USING (true) WITH CHECK (true);