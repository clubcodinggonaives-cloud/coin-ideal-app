CREATE TABLE public.service_images (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt        TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_images ENABLE ROW LEVEL SECURITY;
