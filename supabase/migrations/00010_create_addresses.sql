CREATE TABLE public.addresses (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label      TEXT NOT NULL DEFAULT 'Domicile',
  street     TEXT NOT NULL,
  city       TEXT NOT NULL,
  state      TEXT,
  zip_code   TEXT,
  country    TEXT NOT NULL DEFAULT 'Cote d Ivoire',
  latitude   NUMERIC,
  longitude  NUMERIC,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
