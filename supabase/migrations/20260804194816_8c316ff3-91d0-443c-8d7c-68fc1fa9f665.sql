CREATE TABLE public.npc_book_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  npc_key text NOT NULL,
  page integer NOT NULL DEFAULT 0,
  text text NOT NULL,
  weight integer NOT NULL DEFAULT 1,
  condition jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.npc_book_entries TO authenticated;
GRANT ALL ON public.npc_book_entries TO service_role;

ALTER TABLE public.npc_book_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Book entries readable by authenticated"
ON public.npc_book_entries FOR SELECT TO authenticated USING (true);

CREATE TRIGGER npc_book_entries_set_updated_at
BEFORE UPDATE ON public.npc_book_entries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX npc_book_entries_npc_page_idx ON public.npc_book_entries (npc_key, page);