-- Phase 6 — payment proof (MonCash/NatCash) + delivery address phone.
--
-- payments/orders write access is REVOKEd from authenticated/anon (00028);
-- the only sanctioned write paths are create_order()/update_order_status()/
-- record_payment(). These new orders columns represent the CLIENT's claim
-- of having paid (submitted before staff review) -- payments stays the
-- staff-confirmed ledger, untouched, written only via the existing
-- record_payment() once staff verifies the proof.
ALTER TABLE public.orders
  ADD COLUMN payment_proof_path TEXT,
  ADD COLUMN payment_reference TEXT,
  ADD COLUMN payment_proof_submitted_at TIMESTAMPTZ;

-- addresses has never carried a phone number (00010) -- the order form
-- captured delivery address as free text with no contact number at all.
ALTER TABLE public.addresses
  ADD COLUMN phone TEXT;

-- =============================================================================
-- submit_payment_proof — client-only, own-order-only, and only for the two
-- payment methods that actually use a proof flow (moncash/natcash); cash
-- and transfer are "pay in person" and never call this. Mirrors the
-- ownership-check style already used by create_order()/update_order_status().
-- =============================================================================
CREATE OR REPLACE FUNCTION public.submit_payment_proof(
  p_order_id UUID,
  p_file_path TEXT,
  p_reference TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_method TEXT;
BEGIN
  SELECT client_id, preferred_payment_method INTO v_client_id, v_method
  FROM public.orders
  WHERE id = p_order_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Commande introuvable.';
  END IF;

  IF v_client_id != auth.uid() THEN
    RAISE EXCEPTION 'Vous ne pouvez pas modifier la commande d''un autre client.';
  END IF;

  IF v_method NOT IN ('moncash', 'natcash') THEN
    RAISE EXCEPTION 'Une preuve de paiement n''est requise que pour MonCash ou NatCash.';
  END IF;

  UPDATE public.orders
  SET payment_proof_path = p_file_path,
      payment_reference = p_reference,
      payment_proof_submitted_at = now()
  WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_payment_proof(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(UUID, TEXT, TEXT) TO authenticated;
