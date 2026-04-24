
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
