-- Orders / payments / configurable pricing foundation.
--
-- Fills the gap documented in docs/database/DATABASE_ARCHITECTURE.md §3.1/3.2:
-- the impression/copie workflow (cahier des charges §3-§5) currently has no
-- dedicated table — it's JSON-encoded into service_requests.message, with no
-- payments table at all and a client-computed, unverified total. This
-- migration is purely additive: no existing table, column or policy is
-- altered or dropped.
--
-- Write access to orders/order_items/order_item_finishings/payments is
-- deliberately NOT granted to `authenticated` — see the REVOKE block below.
-- The only supported way to create an order or record a payment is through
-- the SECURITY DEFINER functions at the bottom of this file, so the price
-- and status transitions are always computed/validated server-side, never
-- trusted from the client (this is the same principle 00021's is_admin()
-- and this project's existing RLS already follow, applied to money).

-- =============================================================================
-- 1. Admin-configurable pricing/config tables
-- =============================================================================
CREATE TABLE public.finishing_options (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  cost       NUMERIC(10,2) NOT NULL CHECK (cost >= 0),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.finishing_options ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.delivery_zones (
  id         UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name       TEXT NOT NULL,
  fee        NUMERIC(10,2) NOT NULL CHECK (fee >= 0),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- Generic business config (tariff multipliers, flat fees, retention policy).
-- A key/value table, not one column per setting, precisely because the
-- cahier des charges (§4.3) requires tariffs to change "sans changement de
-- code" — a typed column would need a migration for every new setting.
CREATE TABLE public.settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. Orders
-- =============================================================================
CREATE TABLE public.orders (
  id                   UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  client_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id           UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  -- Status vocabulary is the cahier des charges' own (§5), not the generic
  -- pending/accepted/... vocabulary service_requests/bookings use.
  status               TEXT NOT NULL DEFAULT 'en_attente'
                        CHECK (status IN (
                          'en_attente', 'confirmee', 'en_preparation', 'prete',
                          'en_livraison', 'livree', 'retiree', 'annulee'
                        )),
  reception_method     TEXT NOT NULL CHECK (reception_method IN ('pickup', 'delivery')),
  delivery_address_id  UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
  delivery_zone_id     UUID REFERENCES public.delivery_zones(id) ON DELETE SET NULL,
  delivery_fee         NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  subtotal             NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  total                NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  notes                TEXT,
  cancelled_reason     TEXT,
  ready_at             TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT orders_delivery_address_required
    CHECK (reception_method = 'pickup' OR delivery_address_id IS NOT NULL)
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- unit_price/line_total are SNAPSHOTS taken at order time (copied from
-- services.price / finishing_options.cost), never a live join — so a later
-- tariff change never rewrites an already-placed order's price.
CREATE TABLE public.order_items (
  id          UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  file_path   TEXT, -- path in the private order-documents bucket; NULL if no file (e.g. copy from a physical original dropped off in person)
  file_name   TEXT,
  pages       INTEGER NOT NULL CHECK (pages >= 0),
  copies      INTEGER NOT NULL CHECK (copies >= 1),
  color       TEXT NOT NULL CHECK (color IN ('bw', 'color')),
  sided       TEXT NOT NULL CHECK (sided IN ('simplex', 'duplex')),
  unit_price  NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total  NUMERIC(10,2) NOT NULL CHECK (line_total >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_item_finishings (
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  finishing_id  TEXT NOT NULL REFERENCES public.finishing_options(id) ON DELETE RESTRICT,
  cost          NUMERIC(10,2) NOT NULL CHECK (cost >= 0), -- snapshot
  PRIMARY KEY (order_item_id, finishing_id)
);
ALTER TABLE public.order_item_finishings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_status_history (
  id         UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Cahier des charges §5: "Le système conserve le montant, la méthode, la
-- référence, la date et le statut du paiement."
CREATE TABLE public.payments (
  id          UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  method      TEXT NOT NULL CHECK (method IN ('cash', 'moncash', 'natcash', 'transfer')),
  reference   TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. Triggers
-- =============================================================================
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- 4. Indexes — one per query this schema is actually built to serve
-- =============================================================================
-- Client's "my orders" list / dashboard (mirrors idx_service_requests_client)
CREATE INDEX idx_orders_client ON public.orders(client_id);
-- Staff dashboard filtered by status ("commandes en attente/en préparation/prêtes")
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_service ON public.orders(service_id);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_status_history_order ON public.order_status_history(order_id);
CREATE INDEX idx_payments_order ON public.payments(order_id);
CREATE INDEX idx_payments_status ON public.payments(status);

-- =============================================================================
-- 5. RLS policies
-- =============================================================================
-- finishing_options / delivery_zones / settings: public read of active
-- tariff config (the storefront and the AI assistant both need this to
-- quote a price before the user logs in), admin-only writes.
CREATE POLICY "finishing_options_select_active"
  ON public.finishing_options FOR SELECT
  USING (is_active = true);
CREATE POLICY "finishing_options_admin_all"
  ON public.finishing_options FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "delivery_zones_select_active"
  ON public.delivery_zones FOR SELECT
  USING (is_active = true);
CREATE POLICY "delivery_zones_admin_all"
  ON public.delivery_zones FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "settings_select_public"
  ON public.settings FOR SELECT
  USING (true); -- no secrets live here, only pricing/retention config the storefront must read pre-auth
CREATE POLICY "settings_admin_all"
  ON public.settings FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- orders: client reads own orders; COIN-IDEAL staff (provider|admin) reads
-- all orders — mirrors the existing order_documents_staff_read convention
-- from 00023 (single-tenant reality: "provider" == COIN-IDEAL staff today).
CREATE POLICY "orders_select_client"
  ON public.orders FOR SELECT
  USING (auth.uid() = client_id);
CREATE POLICY "orders_select_staff"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('provider', 'admin')
    )
  );
-- No direct INSERT/UPDATE/DELETE policy on orders for anon/authenticated —
-- see the REVOKE block below. Every write goes through create_order() /
-- update_order_status() so price and status transitions are always
-- computed and validated server-side.

CREATE POLICY "order_items_select_client"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.client_id = auth.uid())
  );
CREATE POLICY "order_items_select_staff"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('provider', 'admin')
    )
  );

CREATE POLICY "order_item_finishings_select_client"
  ON public.order_item_finishings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items
      JOIN public.orders ON orders.id = order_items.order_id
      WHERE order_items.id = order_item_finishings.order_item_id AND orders.client_id = auth.uid()
    )
  );
CREATE POLICY "order_item_finishings_select_staff"
  ON public.order_item_finishings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('provider', 'admin')
    )
  );

CREATE POLICY "order_status_history_select_client"
  ON public.order_status_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_status_history.order_id AND orders.client_id = auth.uid())
  );
CREATE POLICY "order_status_history_select_staff"
  ON public.order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('provider', 'admin')
    )
  );

CREATE POLICY "payments_select_client"
  ON public.payments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = payments.order_id AND orders.client_id = auth.uid())
  );
CREATE POLICY "payments_select_staff"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('provider', 'admin')
    )
  );
-- No direct write policy on payments either — see record_payment() below.

-- =============================================================================
-- 6. Lock down direct writes — 00026 grants blanket INSERT/UPDATE/DELETE to
--    `authenticated` on every table (including future ones, via ALTER
--    DEFAULT PRIVILEGES). That's correct for most of this schema, where RLS
--    is the real boundary — but money and status transitions on `orders`
--    must only ever happen through the validated RPCs below. Revoke the
--    default grant explicitly here instead of relying on RLS alone: a
--    forgotten/misconfigured policy should not be the only thing standing
--    between a client and writing an arbitrary `total` into `orders`.
-- =============================================================================
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.order_item_finishings FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.order_status_history FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.finishing_options FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.delivery_zones FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.settings FROM anon;

-- =============================================================================
-- 7. RPCs — the only supported way to create an order, change its status,
--    or record a payment. Each is SECURITY DEFINER (owned by the migration
--    role, which owns these tables) so it can write despite the REVOKEs
--    above, but every one of them re-derives authorization from auth.uid()
--    internally rather than trusting anything the caller asserts.
-- =============================================================================

-- Creates an order with server-computed pricing. `p_items` shape:
--   [{ "pages": 10, "copies": 2, "color": "bw"|"color", "sided": "simplex"|"duplex",
--      "finishing_ids": ["binding"], "file_path": "...", "file_name": "..." }, ...]
-- Returns the new order id. Raises on any invalid input (inactive service,
-- unknown finishing id, missing delivery address for a delivery order,
-- unauthenticated caller) rather than silently coercing bad data.
CREATE OR REPLACE FUNCTION public.create_order(
  p_service_id UUID,
  p_reception_method TEXT,
  p_items JSONB,
  p_delivery_address_id UUID DEFAULT NULL,
  p_delivery_zone_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
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

  -- Pass 1: validate & total the order before writing anything.
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
    delivery_fee, subtotal, total, notes
  ) VALUES (
    v_client_id, p_service_id, p_reception_method, p_delivery_address_id, p_delivery_zone_id,
    v_delivery_fee, v_subtotal, v_subtotal + v_delivery_fee, p_notes
  )
  RETURNING id INTO v_order_id;

  -- Pass 2: same computation again, this time writing order_items/finishings.
  -- (Recomputed rather than cached from pass 1 to keep this function simple
  -- and obviously correct; p_items is small — a handful of files per order.)
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

REVOKE ALL ON FUNCTION public.create_order(UUID, TEXT, JSONB, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(UUID, TEXT, JSONB, UUID, UUID, TEXT) TO authenticated;

-- Validated status transitions per cahier des charges §5:
--   en_attente -> confirmee | annulee
--   confirmee -> en_preparation | annulee
--   en_preparation -> prete | annulee
--   prete -> retiree (pickup) | en_livraison (delivery) | annulee
--   en_livraison -> livree | annulee
-- Clients may only move their own order from en_attente to annulee; every
-- other transition requires staff (provider|admin).
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_order RECORD;
  v_is_staff BOOLEAN;
  v_allowed BOOLEAN := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found.', p_order_id;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_uid AND role IN ('provider', 'admin')
  ) INTO v_is_staff;

  IF NOT v_is_staff AND v_uid <> v_order.client_id THEN
    RAISE EXCEPTION 'Not authorized to update this order.' USING ERRCODE = '42501';
  END IF;

  IF NOT v_is_staff THEN
    -- Client path: only en_attente -> annulee.
    v_allowed := v_order.status = 'en_attente' AND p_new_status = 'annulee';
  ELSE
    v_allowed := (v_order.status = 'en_attente' AND p_new_status IN ('confirmee', 'annulee'))
      OR (v_order.status = 'confirmee' AND p_new_status IN ('en_preparation', 'annulee'))
      OR (v_order.status = 'en_preparation' AND p_new_status IN ('prete', 'annulee'))
      OR (v_order.status = 'prete' AND (
            (v_order.reception_method = 'pickup' AND p_new_status = 'retiree')
            OR (v_order.reception_method = 'delivery' AND p_new_status = 'en_livraison')
            OR p_new_status = 'annulee'
          ))
      OR (v_order.status = 'en_livraison' AND p_new_status IN ('livree', 'annulee'));
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %', v_order.status, p_new_status;
  END IF;

  UPDATE public.orders
  SET status = p_new_status,
      ready_at = CASE WHEN p_new_status = 'prete' THEN now() ELSE ready_at END,
      completed_at = CASE WHEN p_new_status IN ('livree', 'retiree') THEN now() ELSE completed_at END,
      cancelled_reason = CASE WHEN p_new_status = 'annulee' THEN p_note ELSE cancelled_reason END
  WHERE id = p_order_id;

  INSERT INTO public.order_status_history (order_id, status, changed_by, note)
  VALUES (p_order_id, p_new_status, v_uid, p_note);

  -- TODO (Phase 6, docs/database/DATABASE_IMPLEMENTATION_PLAN.md): insert a
  -- public.notifications row here for the client on every transition, per
  -- cahier des charges §15. Deferred to keep this migration scoped to
  -- orders/payments plumbing.
END;
$$;

REVOKE ALL ON FUNCTION public.update_order_status(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_order_status(UUID, TEXT, TEXT) TO authenticated;

-- Records a payment against an order. Staff-only (a client never asserts
-- "I paid" directly into the ledger — that's what enables fraud). The
-- initial status is 'pending' for moyens like virement/MonCash that need
-- confirmation, or 'confirmed' immediately for cash handed over in person.
CREATE OR REPLACE FUNCTION public.record_payment(
  p_order_id UUID,
  p_amount NUMERIC,
  p_method TEXT,
  p_reference TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'pending'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_is_staff BOOLEAN;
  v_payment_id UUID;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_uid AND role IN ('provider', 'admin')
  ) INTO v_is_staff;

  IF NOT v_is_staff THEN
    RAISE EXCEPTION 'Only COIN-IDEAL staff can record a payment.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id) THEN
    RAISE EXCEPTION 'Order % not found.', p_order_id;
  END IF;

  IF p_method NOT IN ('cash', 'moncash', 'natcash', 'transfer') THEN
    RAISE EXCEPTION 'Invalid payment method: %', p_method;
  END IF;

  INSERT INTO public.payments (order_id, amount, method, reference, status, recorded_by, paid_at)
  VALUES (
    p_order_id, p_amount, p_method, p_reference, p_status, v_uid,
    CASE WHEN p_status = 'confirmed' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_payment(UUID, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_payment(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
