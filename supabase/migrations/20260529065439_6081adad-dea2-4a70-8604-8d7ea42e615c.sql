CREATE TABLE public.quest_flags (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  flag_key text NOT NULL,
  flag_value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, flag_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quest_flags TO authenticated;
GRANT ALL ON public.quest_flags TO service_role;

ALTER TABLE public.quest_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quest flags select own"
  ON public.quest_flags FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Quest flags insert own"
  ON public.quest_flags FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Quest flags update own"
  ON public.quest_flags FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
