CREATE TABLE public.provider_profiles (
  id               UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id          UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name    TEXT NOT NULL,
  description      TEXT,
  specialties      TEXT[],
  experience_years INTEGER,
  location         TEXT,
  latitude         NUMERIC,
  longitude        NUMERIC,
  is_verified      BOOLEAN NOT NULL DEFAULT false,
  is_available     BOOLEAN NOT NULL DEFAULT true,
  rating           NUMERIC(3,2) NOT NULL DEFAULT 0,
  total_reviews    INTEGER NOT NULL DEFAULT 0,
  total_completed  INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
