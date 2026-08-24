
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'aviator_rounds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.aviator_rounds;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'aviator_bets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.aviator_bets;
  END IF;
END $$;
