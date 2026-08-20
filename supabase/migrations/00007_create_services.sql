CREATE TABLE public.services (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id       UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  category_id       UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  description       TEXT,
  price             NUMERIC(10,2) NOT NULL,
  price_unit        TEXT,
  location          TEXT,
  latitude          NUMERIC,
  longitude         NUMERIC,
  estimated_duration TEXT,
  conditions        TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  is_verified       BOOLEAN NOT NULL DEFAULT false,
  rating            NUMERIC(3,2) NOT NULL DEFAULT 0,
  total_reviews     INTEGER NOT NULL DEFAULT 0,
  total_orders      INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (provider_id, slug)
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
