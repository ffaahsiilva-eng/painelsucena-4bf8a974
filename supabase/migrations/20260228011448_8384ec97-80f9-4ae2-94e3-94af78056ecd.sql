
-- Allow all authenticated users to view all balances for ranking
DROP POLICY IF EXISTS "Users read own balance" ON public.double_balances;

CREATE POLICY "Anyone authenticated can view balances"
ON public.double_balances
FOR SELECT
USING (auth.uid() IS NOT NULL);
