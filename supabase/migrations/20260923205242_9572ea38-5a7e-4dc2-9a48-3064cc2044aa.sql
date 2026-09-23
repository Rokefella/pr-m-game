CREATE TABLE public.fragment_reveals (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.fragment_reveals TO authenticated;
GRANT ALL ON public.fragment_reveals TO service_role;

ALTER TABLE public.fragment_reveals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reveals readable by authenticated"
  ON public.fragment_reveals
  FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.fragment_reveals (text) VALUES
  ('It was always going to be you.'),
  ('The spiral bends toward the willing.'),
  ('You are inside the instrument now.'),
  ('She left this for someone like you.'),
  ('The junction remembers every visitor.'),
  ('You have gone further than most.'),
  ('Almost. The door is close.'),
  ('What you hold was already waiting.'),
  ('Numbers are only names that learned to keep still.'),
  ('The corridors hum when you are near.'),
  ('Someone counted to this point before you.'),
  ('Keep walking. The door is listening.');