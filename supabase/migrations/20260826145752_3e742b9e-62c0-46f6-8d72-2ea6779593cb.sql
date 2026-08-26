CREATE TABLE public.exchange_listings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fragment_id uuid NOT NULL REFERENCES public.fragments(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price integer NOT NULL CHECK (price > 0),
  status text NOT NULL DEFAULT 'active',
  buyer_id uuid,
  sold_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX exchange_listings_one_active_per_fragment
  ON public.exchange_listings (fragment_id) WHERE status = 'active';

GRANT SELECT, INSERT, UPDATE ON public.exchange_listings TO authenticated;
GRANT ALL ON public.exchange_listings TO service_role;

ALTER TABLE public.exchange_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Listings readable by authenticated" ON public.exchange_listings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Listings insert own" ON public.exchange_listings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Listings update own" ON public.exchange_listings
  FOR UPDATE TO authenticated USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

CREATE OR REPLACE FUNCTION public.purchase_fragment_listing(p_listing_id uuid, p_buyer_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing public.exchange_listings;
  v_credits integer;
BEGIN
  SELECT * INTO v_listing FROM public.exchange_listings
    WHERE id = p_listing_id FOR UPDATE;

  IF v_listing.id IS NULL OR v_listing.status <> 'active' THEN
    RAISE EXCEPTION 'This listing is no longer available';
  END IF;

  IF v_listing.seller_id = p_buyer_id THEN
    RAISE EXCEPTION 'You cannot buy your own listing';
  END IF;

  SELECT credits INTO v_credits FROM public.users WHERE id = p_buyer_id FOR UPDATE;
  IF v_credits IS NULL THEN
    RAISE EXCEPTION 'Buyer not found';
  END IF;
  IF v_credits < v_listing.price THEN
    RAISE EXCEPTION 'Not enough credits';
  END IF;

  UPDATE public.users SET credits = credits - v_listing.price WHERE id = p_buyer_id;
  UPDATE public.users SET credits = credits + v_listing.price WHERE id = v_listing.seller_id;

  UPDATE public.fragments SET user_id = p_buyer_id, banked = true
    WHERE id = v_listing.fragment_id;

  UPDATE public.exchange_listings
    SET status = 'sold', buyer_id = p_buyer_id, sold_at = now()
    WHERE id = v_listing.id;

  RETURN v_listing.fragment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_fragment_listing(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_fragment_listing(uuid, uuid) TO authenticated;