CREATE TABLE public.service_requests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id       UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  provider_id      UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  message          TEXT,
  preferred_date   DATE,
  preferred_time   TIME,
  address          TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  response_message TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
