CREATE TABLE public.fragments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prime_number INTEGER NOT NULL,
  level INTEGER NOT NULL,
  image_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, prime_number, level)
);

CREATE INDEX fragments_user_level_idx ON public.fragments(user_id, level);

ALTER TABLE public.fragments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fragments"
  ON public.fragments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fragments"
  ON public.fragments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fragments"
  ON public.fragments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);