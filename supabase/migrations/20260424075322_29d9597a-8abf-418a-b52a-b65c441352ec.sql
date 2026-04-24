
DROP POLICY IF EXISTS "Users can insert their own row" ON public.users;
DROP POLICY IF EXISTS "Users can update their own row" ON public.users;
DROP POLICY IF EXISTS "Users can view their own row" ON public.users;
DROP POLICY IF EXISTS "open" ON public.users;

DROP POLICY IF EXISTS "Users can delete their own fragments" ON public.fragments;
DROP POLICY IF EXISTS "Users can insert their own fragments" ON public.fragments;
DROP POLICY IF EXISTS "Users can view their own fragments" ON public.fragments;
DROP POLICY IF EXISTS "open" ON public.fragments;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON public.users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.fragments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON public.fragments FOR ALL USING (true) WITH CHECK (true);
