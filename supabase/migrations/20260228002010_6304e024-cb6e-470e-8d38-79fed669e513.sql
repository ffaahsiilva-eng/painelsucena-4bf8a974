
-- Aviator game rounds
CREATE TABLE public.aviator_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crash_point NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, running, crashed
  started_at TIMESTAMPTZ,
  crashed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.aviator_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rounds" ON public.aviator_rounds FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert rounds" ON public.aviator_rounds FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update rounds" ON public.aviator_rounds FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Aviator bets
CREATE TABLE public.aviator_bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.aviator_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  avatar_url TEXT,
  bet_amount NUMERIC(10,2) NOT NULL,
  cashed_out_at NUMERIC(10,2),
  payout NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.aviator_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bets" ON public.aviator_bets FOR SELECT USING (true);
CREATE POLICY "Users can insert own bets" ON public.aviator_bets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bets" ON public.aviator_bets FOR UPDATE USING (auth.uid() = user_id);

-- Aviator balances (simulation)
CREATE TABLE public.aviator_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC(10,2) NOT NULL DEFAULT 3000.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.aviator_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own balance" ON public.aviator_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own balance" ON public.aviator_balances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own balance" ON public.aviator_balances FOR UPDATE USING (auth.uid() = user_id);

-- Enable realtime for bets and rounds
ALTER PUBLICATION supabase_realtime ADD TABLE public.aviator_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.aviator_bets;
