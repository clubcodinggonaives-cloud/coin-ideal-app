CREATE TABLE public.bookings (
  id             UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  request_id     UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  client_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id    UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  service_id     UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  total_price    NUMERIC(10,2),
  notes          TEXT,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
