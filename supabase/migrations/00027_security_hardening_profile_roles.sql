-- Security hardening — profile role integrity.
--
-- Two independent bugs found during the Phase-1 database review
-- (docs/database/DATABASE_ARCHITECTURE.md §5):
--
-- BUG 1 (privilege escalation): `profiles_update_own` (00020) is
--   USING (auth.uid() = id) WITH CHECK (auth.uid() = id) — it authorizes the
--   *row*, not the *columns*. Any authenticated user can currently run, from
--   the browser console:
--     supabase.from('profiles').update({ role: 'admin' }).eq('id', myId)
--   and become an admin. Nothing in the schema stops this today.
--
-- BUG 2 (admin panel silently broken): src/services/admin.service.ts
--   `suspendUser()` / provider verification flows call
--   `profiles.update({ role: ... }).eq('id', someOtherUserId)` as the
--   *admin's own* authenticated session. No existing RLS policy on
--   `profiles` allows updating a row that isn't your own — admin or not —
--   so that call affects 0 rows silently (Supabase does not error on an
--   UPDATE that matches 0 rows unless the caller checks explicitly).
--
-- Fix: a BEFORE UPDATE trigger that blocks any *non-admin* from changing
-- `role` on ANY profiles row, regardless of which permissive RLS policy let
-- the UPDATE through (defense in depth — this keeps working even if a
-- future policy is added carelessly) — plus a genuine admin-all policy so
-- admin role management actually works.
--
-- Idempotent: DROP IF EXISTS before every CREATE, safe to re-run.

-- =============================================================================
-- 1. Role-change guard trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION public.enforce_profile_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- auth.uid() IS NULL means this UPDATE did not go through PostgREST with a
  -- user JWT at all (anon requests never reach here either — RLS already
  -- blocks anon from updating any profiles row, since every policy's USING
  -- clause requires auth.uid() to match something). A NULL auth.uid() here
  -- can only be a direct/superuser connection: a migration, supabase/seed.sql
  -- (see its dev-account promotion to role='provider'), the SQL editor, or
  -- the service_role key — all of which already bypass RLS entirely as the
  -- table owner, so this trigger deliberately does not re-block them; it
  -- only guards the one path RLS *doesn't* already cover on its own: an
  -- ordinary authenticated user updating their own row through the API.
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin(auth.uid())
  THEN
    RAISE EXCEPTION 'Only administrators can change a profile role.'
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_role_guard ON public.profiles;
CREATE TRIGGER trg_profiles_role_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_role_change();

-- =============================================================================
-- 2. Admin can actually manage any profile (fixes suspendUser/verification)
-- =============================================================================
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Note: the trigger above still applies to admin-issued updates too — an
-- admin's UPDATE naturally passes it since public.is_admin(auth.uid())
-- is true for them, so this does not lock admins out of role management.

-- =============================================================================
-- 3. Same column-integrity problem on service_requests / bookings:
--    "cancel my own request/booking" policies (00020) have no column
--    restriction, so a client can currently rewrite status to any value
--    (not just 'cancelled'), or provider_id/service_id/response_message/
--    total_price on a row they merely own. Guard both the same way.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.enforce_service_request_client_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  acting_is_provider BOOLEAN;
BEGIN
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.provider_profiles
    WHERE provider_profiles.id = OLD.provider_id AND provider_profiles.user_id = auth.uid()
  ) INTO acting_is_provider;

  IF acting_is_provider THEN
    RETURN NEW; -- provider path already covered by service_requests_update_provider's own scope
  END IF;

  IF auth.uid() = OLD.client_id THEN
    -- Client-only update: allowed exactly one shape — cancel a still-pending request.
    IF OLD.status <> 'pending'
       OR NEW.status IS DISTINCT FROM 'cancelled'
       OR NEW.provider_id IS DISTINCT FROM OLD.provider_id
       OR NEW.service_id IS DISTINCT FROM OLD.service_id
       OR NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.response_message IS DISTINCT FROM OLD.response_message
       OR NEW.message IS DISTINCT FROM OLD.message
    THEN
      RAISE EXCEPTION 'Clients may only cancel their own pending requests.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW; -- neither client nor provider nor admin: RLS USING clauses already block this row from being visible/updatable
END;
$$;

DROP TRIGGER IF EXISTS trg_service_requests_client_update_guard ON public.service_requests;
CREATE TRIGGER trg_service_requests_client_update_guard
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_service_request_client_update();

CREATE OR REPLACE FUNCTION public.enforce_booking_client_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  acting_is_provider BOOLEAN;
BEGIN
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.provider_profiles
    WHERE provider_profiles.id = OLD.provider_id AND provider_profiles.user_id = auth.uid()
  ) INTO acting_is_provider;

  IF acting_is_provider THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.client_id THEN
    IF OLD.status NOT IN ('pending', 'confirmed')
       OR NEW.status IS DISTINCT FROM 'cancelled'
       OR NEW.provider_id IS DISTINCT FROM OLD.provider_id
       OR NEW.service_id IS DISTINCT FROM OLD.service_id
       OR NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.total_price IS DISTINCT FROM OLD.total_price
       OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
       OR NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time
    THEN
      RAISE EXCEPTION 'Clients may only cancel their own pending or confirmed bookings.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_client_update_guard ON public.bookings;
CREATE TRIGGER trg_bookings_client_update_guard
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_client_update();
