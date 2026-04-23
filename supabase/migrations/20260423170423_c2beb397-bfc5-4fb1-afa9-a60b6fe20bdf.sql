-- Add registration_number as an auto-incrementing identity column
ALTER TABLE public.users
  ADD COLUMN registration_number INTEGER;

-- Backfill existing rows in created_at order
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM public.users
)
UPDATE public.users u
SET registration_number = ordered.rn
FROM ordered
WHERE u.id = ordered.id;

-- Create a sequence starting after the current max
DO $$
DECLARE
  next_val INTEGER;
BEGIN
  SELECT COALESCE(MAX(registration_number), 0) + 1 INTO next_val FROM public.users;
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS public.users_registration_number_seq START WITH %s', next_val);
END $$;

ALTER TABLE public.users
  ALTER COLUMN registration_number SET DEFAULT nextval('public.users_registration_number_seq'),
  ALTER COLUMN registration_number SET NOT NULL;

ALTER SEQUENCE public.users_registration_number_seq OWNED BY public.users.registration_number;

CREATE UNIQUE INDEX users_registration_number_key ON public.users(registration_number);