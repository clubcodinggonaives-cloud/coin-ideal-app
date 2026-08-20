CREATE TABLE public.service_availability (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id  UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.service_availability ENABLE ROW LEVEL SECURITY;
