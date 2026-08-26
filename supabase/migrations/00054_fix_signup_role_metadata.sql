-- handle_new_user() (00003) only ever copied first_name/last_name from signup
-- metadata -- it silently ignored `role`, so every signup landed as the
-- column default 'client' regardless of what /auth/register's role picker
-- sent. Documented as a known, deliberately-deferred gap in 00037's own
-- comment ("the role picker's metadata is ignored by handle_new_user(), a
-- known gap, not fixed here") -- fixing it now.
--
-- Security: raw_user_meta_data is fully client-controlled (anyone can POST
-- arbitrary `options.data` to Supabase's signup endpoint, bypassing the UI
-- entirely) -- so this must NOT trust an arbitrary role value. Only
-- 'provider' is honored; anything else (including a client attempting to
-- self-elevate to 'admin') falls back to the column default 'client'.
-- Also auto-creates the matching provider_profiles row when role='provider'
-- -- without it, /provider/profile has no row to load (infinite skeleton,
-- confirmed by reading that page's `if (isLoading || !provider) return
-- <Skeleton/>` with no create-form fallback) and /provider/services/new
-- throws "Profil prestataire introuvable". business_name is NOT NULL with
-- no column default, so a real starting value is required; the person's own
-- name is used as a sensible default they're expected to edit on
-- /provider/profile, not a placeholder invented for its own sake.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := CASE
    WHEN NEW.raw_user_meta_data ->> 'role' = 'provider' THEN 'provider'
    ELSE 'client'
  END;

  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    v_role
  );

  IF v_role = 'provider' THEN
    INSERT INTO public.provider_profiles (user_id, business_name)
    VALUES (
      NEW.id,
      COALESCE(
        NULLIF(
          TRIM(
            COALESCE(NEW.raw_user_meta_data ->> 'first_name', '') || ' ' ||
            COALESCE(NEW.raw_user_meta_data ->> 'last_name', '')
          ),
          ''
        ),
        'Nouveau prestataire'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
