CREATE TABLE IF NOT EXISTS public.player_positions (
  user_id UUID NOT NULL PRIMARY KEY,
  x DOUBLE PRECISION NOT NULL DEFAULT 0,
  y DOUBLE PRECISION NOT NULL DEFAULT 0,
  village_level INTEGER NOT NULL DEFAULT 1,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_positions TO authenticated;
GRANT ALL ON public.player_positions TO service_role;
ALTER TABLE public.player_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Positions readable by authenticated" ON public.player_positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Positions insert own" ON public.player_positions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Positions update own" ON public.player_positions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Positions delete own" ON public.player_positions FOR DELETE TO authenticated USING (auth.uid() = user_id);
ALTER TABLE public.player_positions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_positions;