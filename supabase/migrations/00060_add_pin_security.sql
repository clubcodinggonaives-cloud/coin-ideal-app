-- Phase 6 — 6-digit PIN step-up for admin/provider. pgcrypto's crypt()/
-- gen_salt('bf') is already used elsewhere in this project's migrations
-- (e.g. 00039, 00045, for auth.users password hashes) confirming the
-- extension is already active; declared here too for clarity/robustness.
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

ALTER TABLE public.profiles
  ADD COLUMN pin_hash TEXT,
  ADD COLUMN pin_set_at TIMESTAMPTZ,
  ADD COLUMN failed_pin_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN pin_locked_until TIMESTAMPTZ;

-- =============================================================================
-- set_pin — first-time setup or reset of the caller's own PIN. Only
-- admin/provider accounts use this feature; a client calling it is
-- rejected (matches the role-gated convention already used by is_admin()/
-- is_staff(), 00021/00051). Never returns or logs the raw PIN.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_pin(p_pin TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  IF v_role IS NULL OR v_role NOT IN ('admin', 'provider') THEN
    RAISE EXCEPTION 'PIN security is only available for admin/provider accounts.';
  END IF;

  IF p_pin !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'Le code PIN doit contenir exactement 6 chiffres.';
  END IF;

  UPDATE public.profiles
  SET pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')),
      pin_set_at = now(),
      failed_pin_attempts = 0,
      pin_locked_until = NULL
  WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.set_pin(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_pin(TEXT) TO authenticated;

-- =============================================================================
-- verify_pin — the only place a PIN comparison ever happens; the client
-- never sees pin_hash. Rate-limited: 5 wrong attempts locks verification
-- for 15 minutes, tracked server-side (not resettable by the client).
-- Never reveals partial matches -- boolean + lockout timestamp only.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.verify_pin(p_pin TEXT)
RETURNS TABLE(ok BOOLEAN, locked_until TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
  v_locked_until TIMESTAMPTZ;
  v_attempts INTEGER;
BEGIN
  SELECT pin_hash, pin_locked_until, failed_pin_attempts
    INTO v_hash, v_locked_until, v_attempts
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    RETURN QUERY SELECT false, v_locked_until;
    RETURN;
  END IF;

  IF v_hash IS NOT NULL AND extensions.crypt(p_pin, v_hash) = v_hash THEN
    UPDATE public.profiles SET failed_pin_attempts = 0, pin_locked_until = NULL WHERE id = auth.uid();
    RETURN QUERY SELECT true, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  v_attempts := COALESCE(v_attempts, 0) + 1;
  IF v_attempts >= 5 THEN
    UPDATE public.profiles
    SET failed_pin_attempts = 0, pin_locked_until = now() + interval '15 minutes'
    WHERE id = auth.uid();
    RETURN QUERY SELECT false, (now() + interval '15 minutes');
  ELSE
    UPDATE public.profiles SET failed_pin_attempts = v_attempts WHERE id = auth.uid();
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_pin(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_pin(TEXT) TO authenticated;
