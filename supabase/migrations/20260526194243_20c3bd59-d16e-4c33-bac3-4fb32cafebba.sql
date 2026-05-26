
DROP POLICY IF EXISTS "open" ON public.users;
DROP POLICY IF EXISTS "open" ON public.fragments;

REVOKE ALL ON public.users FROM anon;
REVOKE ALL ON public.fragments FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fragments TO authenticated;
GRANT ALL ON public.fragments TO service_role;

CREATE POLICY "Users select own row" ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own row" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own row" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users delete own row" ON public.users FOR DELETE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Fragments select own" ON public.fragments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Fragments insert own" ON public.fragments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Fragments update own" ON public.fragments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Fragments delete own" ON public.fragments FOR DELETE TO authenticated USING (auth.uid() = user_id);
