
-- Double Game rounds
CREATE TABLE public.double_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_number int NOT NULL,
  result_color text NOT NULL CHECK (result_color IN ('red','black','white')),
  crash_point numeric(10,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'betting' CHECK (status IN ('betting','spinning','finished')),
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Double Game bets
CREATE TABLE public.double_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES public.double_rounds(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  avatar_url text,
  bet_color text NOT NULL CHECK (bet_color IN ('red','black','white')),
  bet_amount numeric(12,2) NOT NULL CHECK (bet_amount >= 0.10 AND bet_amount <= 450000),
  payout numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Double Game balances (reuse aviator_balances if exists, else create)
CREATE TABLE IF NOT EXISTS public.double_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric(14,2) NOT NULL DEFAULT 5000.00,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.double_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.double_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.double_balances ENABLE ROW LEVEL SECURITY;

-- RLS: Everyone authenticated can read rounds
CREATE POLICY "Anyone can read rounds" ON public.double_rounds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can insert rounds" ON public.double_rounds FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update rounds" ON public.double_rounds FOR UPDATE TO authenticated USING (true);

-- RLS: Bets
CREATE POLICY "Anyone can read bets" ON public.double_bets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can place bets" ON public.double_bets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- RLS: Balances
CREATE POLICY "Users read own balance" ON public.double_balances FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own balance" ON public.double_balances FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own balance" ON public.double_balances FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.double_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.double_bets;

-- Index for fast queries
CREATE INDEX idx_double_bets_round ON public.double_bets(round_id);
CREATE INDEX idx_double_rounds_status ON public.double_rounds(status);
CREATE INDEX idx_double_rounds_created ON public.double_rounds(created_at DESC);
