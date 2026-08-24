-- Gap found during frontend integration (docs/database/FRONTEND_DATABASE_MAPPING.md
-- Phase 3): the order form (src/pages/order/document.tsx) has always captured
-- the client's chosen payment method (cahier des charges §3 step 6 —
-- "Le client sélectionne un moyen de paiement disponible") but 00028's
-- `orders` table has nowhere to store it. `payments.method` is not a
-- substitute — that column is only populated later, by staff, once a
-- payment is actually recorded via `record_payment()`.
--
-- This is a client-stated INTENT, not a financial record — it does not
-- need the same write-lockdown as `orders.total`/`payments`, so a plain
-- nullable column with a normal RLS-governed UPDATE is appropriate (no new
-- RPC needed). Non-destructive: adds one nullable column, changes nothing
-- existing.

ALTER TABLE public.orders
  ADD COLUMN preferred_payment_method TEXT
    CHECK (preferred_payment_method IN ('cash', 'moncash', 'natcash', 'transfer'));

COMMENT ON COLUMN public.orders.preferred_payment_method IS
  'Moyen de paiement choisi par le client au moment de la commande (déclaratif). Le paiement réellement enregistré, avec référence et statut, vit dans public.payments via record_payment().';

-- create_order() needs to accept and persist it. Adding a parameter changes
-- the function's signature, so CREATE OR REPLACE alone would leave the old
-- 6-arg version behind as a second overload rather than replacing it — drop
-- it explicitly first so there is exactly one create_order().
DROP FUNCTION IF EXISTS public.create_order(UUID, TEXT, JSONB, UUID, UUID, TEXT);

CREATE FUNCTION public.create_order(
  p_service_id UUID,
  p_reception_method TEXT,
  p_items JSONB,
  p_delivery_address_id UUID DEFAULT NULL,
  p_delivery_zone_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_preferred_payment_method TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_client_id UUID := auth.uid();
  v_service RECORD;
  v_color_ratio NUMERIC;
  v_flat_delivery_fee NUMERIC;
  v_delivery_fee NUMERIC := 0;
  v_subtotal NUMERIC := 0;
  v_order_id UUID;
  v_item JSONB;
  v_item_unit_price NUMERIC;
  v_item_line_total NUMERIC;
  v_order_item_id UUID;
  v_finishing_id TEXT;
  v_finishing_cost NUMERIC;
BEGIN
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '28000';
  END IF;

  IF p_reception_method NOT IN ('pickup', 'delivery') THEN
    RAISE EXCEPTION 'Invalid reception_method: %', p_reception_method;
  END IF;

  IF p_reception_method = 'delivery' AND p_delivery_address_id IS NULL THEN
    RAISE EXCEPTION 'delivery_address_id is required for a delivery order.';
  END IF;

  IF p_delivery_address_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.addresses WHERE id = p_delivery_address_id AND user_id = v_client_id
  ) THEN
    RAISE EXCEPTION 'delivery_address_id does not belong to the caller.';
  END IF;

  IF p_preferred_payment_method IS NOT NULL
     AND p_preferred_payment_method NOT IN ('cash', 'moncash', 'natcash', 'transfer')
  THEN
    RAISE EXCEPTION 'Invalid preferred_payment_method: %', p_preferred_payment_method;
  END IF;

  SELECT * INTO v_service FROM public.services WHERE id = p_service_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service % is not available.', p_service_id;
  END IF;

  SELECT COALESCE((value #>> '{}')::numeric, 1) INTO v_color_ratio
  FROM public.settings WHERE key = 'color_surcharge_ratio';
  v_color_ratio := COALESCE(v_color_ratio, 1);

  IF p_reception_method = 'delivery' THEN
    IF p_delivery_zone_id IS NOT NULL THEN
      SELECT fee INTO v_delivery_fee FROM public.delivery_zones
        WHERE id = p_delivery_zone_id AND is_active = true;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'delivery_zone_id % is not available.', p_delivery_zone_id;
      END IF;
    ELSE
      SELECT COALESCE((value #>> '{}')::numeric, 0) INTO v_flat_delivery_fee
      FROM public.settings WHERE key = 'flat_delivery_fee';
      v_delivery_fee := COALESCE(v_flat_delivery_fee, 0);
    END IF;
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'p_items must be a non-empty JSON array.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF (v_item->>'pages')::int < 0 OR (v_item->>'copies')::int < 1 THEN
      RAISE EXCEPTION 'Invalid pages/copies in order item.';
    END IF;
    IF v_item->>'color' NOT IN ('bw', 'color') THEN
      RAISE EXCEPTION 'Invalid color in order item: %', v_item->>'color';
    END IF;
    IF v_item->>'sided' NOT IN ('simplex', 'duplex') THEN
      RAISE EXCEPTION 'Invalid sided in order item: %', v_item->>'sided';
    END IF;

    v_item_unit_price := v_service.price * (CASE WHEN v_item->>'color' = 'color' THEN v_color_ratio ELSE 1 END);
    v_item_line_total := (v_item->>'pages')::int * (v_item->>'copies')::int * v_item_unit_price;

    IF v_item ? 'finishing_ids' THEN
      FOR v_finishing_id IN SELECT jsonb_array_elements_text(v_item->'finishing_ids')
      LOOP
        SELECT cost INTO v_finishing_cost FROM public.finishing_options
          WHERE id = v_finishing_id AND is_active = true;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Unknown or inactive finishing option: %', v_finishing_id;
        END IF;
        v_item_line_total := v_item_line_total + v_finishing_cost;
      END LOOP;
    END IF;

    v_subtotal := v_subtotal + v_item_line_total;
  END LOOP;

  INSERT INTO public.orders (
    client_id, service_id, reception_method, delivery_address_id, delivery_zone_id,
    delivery_fee, subtotal, total, notes, preferred_payment_method
  ) VALUES (
    v_client_id, p_service_id, p_reception_method, p_delivery_address_id, p_delivery_zone_id,
    v_delivery_fee, v_subtotal, v_subtotal + v_delivery_fee, p_notes, p_preferred_payment_method
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_unit_price := v_service.price * (CASE WHEN v_item->>'color' = 'color' THEN v_color_ratio ELSE 1 END);
    v_item_line_total := (v_item->>'pages')::int * (v_item->>'copies')::int * v_item_unit_price;

    IF v_item ? 'finishing_ids' THEN
      FOR v_finishing_id IN SELECT jsonb_array_elements_text(v_item->'finishing_ids')
      LOOP
        SELECT cost INTO v_finishing_cost FROM public.finishing_options WHERE id = v_finishing_id;
        v_item_line_total := v_item_line_total + v_finishing_cost;
      END LOOP;
    END IF;

    INSERT INTO public.order_items (
      order_id, file_path, file_name, pages, copies, color, sided, unit_price, line_total
    ) VALUES (
      v_order_id, v_item->>'file_path', v_item->>'file_name',
      (v_item->>'pages')::int, (v_item->>'copies')::int, v_item->>'color', v_item->>'sided',
      v_item_unit_price, v_item_line_total
    )
    RETURNING id INTO v_order_item_id;

    IF v_item ? 'finishing_ids' THEN
      FOR v_finishing_id IN SELECT jsonb_array_elements_text(v_item->'finishing_ids')
      LOOP
        SELECT cost INTO v_finishing_cost FROM public.finishing_options WHERE id = v_finishing_id;
        INSERT INTO public.order_item_finishings (order_item_id, finishing_id, cost)
        VALUES (v_order_item_id, v_finishing_id, v_finishing_cost);
      END LOOP;
    END IF;
  END LOOP;

  INSERT INTO public.order_status_history (order_id, status, changed_by, note)
  VALUES (v_order_id, 'en_attente', v_client_id, 'Commande créée par le client.');

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order(UUID, TEXT, JSONB, UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(UUID, TEXT, JSONB, UUID, UUID, TEXT, TEXT) TO authenticated;
