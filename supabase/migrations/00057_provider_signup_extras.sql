-- Second extension of handle_new_user() (after 00054's role fix): the new
-- provider registration form now also asks "what service(s) do you offer",
-- collected as free text and stored as the new provider_profiles row's
-- initial description (editable later on /provider/profile, same field).
-- The legal document (patente / carte professionnelle) is NOT stored here
-- -- it's uploaded straight to the existing private 'provider-documents'
-- bucket (00023) once the account exists and the user has a real session,
-- exactly like order documents already work (uploadOrderDocument pattern).
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
    INSERT INTO public.provider_profiles (user_id, business_name, description)
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
      ),
      NULLIF(NEW.raw_user_meta_data ->> 'proposed_services', '')
    );
  END IF;

  RETURN NEW;
END;
$$;
