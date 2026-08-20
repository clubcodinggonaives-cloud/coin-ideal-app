-- Check if a user has the admin role
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = uid AND profiles.role = 'admin'
  );
$$;

-- Recalculate provider average rating from reviews
CREATE OR REPLACE FUNCTION public.update_provider_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_provider_id UUID;
BEGIN
  target_provider_id := COALESCE(NEW.provider_id, OLD.provider_id);

  UPDATE public.provider_profiles
  SET
    rating = COALESCE(
      (SELECT ROUND(AVG(rating)::numeric, 2)
       FROM public.reviews
       WHERE provider_id = target_provider_id),
      0
    ),
    total_reviews = (
      SELECT COUNT(*)::integer
      FROM public.reviews
      WHERE provider_id = target_provider_id
    )
  WHERE id = target_provider_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recalculate service average rating from reviews
CREATE OR REPLACE FUNCTION public.update_service_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_service_id UUID;
BEGIN
  target_service_id := COALESCE(NEW.service_id, OLD.service_id);

  IF target_service_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.services
  SET
    rating = COALESCE(
      (SELECT ROUND(AVG(rating)::numeric, 2)
       FROM public.reviews
       WHERE service_id = target_service_id),
      0
    ),
    total_reviews = (
      SELECT COUNT(*)::integer
      FROM public.reviews
      WHERE service_id = target_service_id
    )
  WHERE id = target_service_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- TRIGGERS: updated_at
-- =============================================================================
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_provider_profiles_updated_at
  BEFORE UPDATE ON public.provider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- TRIGGERS: rating recalculation
-- =============================================================================
CREATE TRIGGER on_review_change_update_provider_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_provider_rating();

CREATE TRIGGER on_review_change_update_service_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_service_rating();
