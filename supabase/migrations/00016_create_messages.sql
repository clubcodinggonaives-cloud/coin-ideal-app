CREATE TABLE public.messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id  UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
