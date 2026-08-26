CREATE OR REPLACE FUNCTION public.purchase_fragment_listing(p_listing_id uuid, p_buyer_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing public.exchange_listings;
  v_credits integer;
  v_buyer uuid := auth.uid();
BEGIN
  IF v_buyer IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to buy';
  END IF;
  IF p_buyer_id IS NOT NULL AND p_buyer_id <> v_buyer THEN
    RAISE EXCEPTION 'You can only purchase for yourself';
  END IF;

  SELECT * INTO v_listing FROM public.exchange_listings
    WHERE id = p_listing_id FOR UPDATE;

  IF v_listing.id IS NULL OR v_listing.status <> 'active' THEN
    RAISE EXCEPTION 'This listing is no longer available';
  END IF;

  IF v_listing.seller_id = v_buyer THEN
    RAISE EXCEPTION 'You cannot buy your own listing';
  END IF;

  SELECT credits INTO v_credits FROM public.users WHERE id = v_buyer FOR UPDATE;
  IF v_credits IS NULL THEN
    RAISE EXCEPTION 'Buyer not found';
  END IF;
  IF v_credits < v_listing.price THEN
    RAISE EXCEPTION 'Not enough credits';
  END IF;

  UPDATE public.users SET credits = credits - v_listing.price WHERE id = v_buyer;
  UPDATE public.users SET credits = credits + v_listing.price WHERE id = v_listing.seller_id;

  UPDATE public.fragments SET user_id = v_buyer, banked = true
    WHERE id = v_listing.fragment_id;

  UPDATE public.exchange_listings
    SET status = 'sold', buyer_id = v_buyer, sold_at = now()
    WHERE id = v_listing.id;

  RETURN v_listing.fragment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_fragment_listing(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purchase_fragment_listing(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.purchase_fragment_listing(uuid, uuid) TO authenticated;