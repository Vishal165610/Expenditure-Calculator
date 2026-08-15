-- UPI payments: each roommate can set their own VPA on their profile
ALTER TABLE public.profiles ADD COLUMN upi_id TEXT;

-- Personal expense tracking: private per-user records, not part of the shared ledger
CREATE TABLE public.personal_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL DEFAULT 'Other',
  notes TEXT,
  spent_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_expenses TO authenticated;
GRANT ALL ON public.personal_expenses TO service_role;
ALTER TABLE public.personal_expenses ENABLE ROW LEVEL SECURITY;

-- Strictly private: a user can only ever see or touch their own rows
CREATE POLICY "personal_expenses_own" ON public.personal_expenses
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX personal_expenses_user_spent_on_idx
  ON public.personal_expenses (user_id, spent_on DESC);

-- Force PostgREST to pick up the new column + table right away,
-- instead of waiting for its next automatic schema refresh.
NOTIFY pgrst, 'reload schema';