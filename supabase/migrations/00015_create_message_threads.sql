CREATE TABLE public.message_threads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_1   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_2   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (participant_1 < participant_2)
);

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
