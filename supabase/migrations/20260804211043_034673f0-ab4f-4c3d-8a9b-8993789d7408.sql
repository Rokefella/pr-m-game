ALTER TABLE public.npc_book_entries
  ADD COLUMN IF NOT EXISTS bucket_key text,
  ADD COLUMN IF NOT EXISTS options jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS npc_book_entries_bucket_idx ON public.npc_book_entries (npc_key, bucket_key);