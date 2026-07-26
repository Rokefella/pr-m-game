CREATE TABLE public.library (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prime_number integer NOT NULL,
  level integer NOT NULL,
  transferred_at timestamp with time zone NOT NULL DEFAULT now(),
  image_data text,
  CONSTRAINT library_user_prime_unique UNIQUE (user_id, prime_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library TO authenticated;
GRANT ALL ON public.library TO service_role;

ALTER TABLE public.library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Library select own" ON public.library FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Library insert own" ON public.library FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Library update own" ON public.library FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Library delete own" ON public.library FOR DELETE TO authenticated USING (auth.uid() = user_id);