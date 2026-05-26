ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS subscription_tier text,
  ADD COLUMN IF NOT EXISTS trial_end timestamp with time zone NOT NULL DEFAULT (now() + interval '14 days');