-- Contact form (Phase 5B). The public site's /contact page had no real
-- destination for submitted messages — the form did `await sleep(1000)`
-- then `console.log`, always showing a fake success. Cahier des charges §7
-- lists a "Contact" page but doesn't detail a backend workflow beyond that;
-- this follows the same pattern already used everywhere else in this
-- schema (submit -> stored row -> staff reviews via /admin/*), rather than
-- inventing a new one (e.g. no email-sending integration exists in this
-- stack to build "auto-forward by email" on top of).
--
-- No user_id / ownership column: submitting the contact form never
-- requires being logged in (cahier des charges §7 lists it under the
-- public site, no auth implied), so there is no "my messages" concept to
-- scope by owner the way `messages`/`orders` do. RLS reflects that: public
-- can INSERT, nobody but staff can ever SELECT/UPDATE/DELETE a row -- not
-- even the person who submitted it, since they have no session tying them
-- to it.
CREATE TABLE public.contact_messages (
  id         UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_contact_messages_status ON public.contact_messages(status);
CREATE INDEX idx_contact_messages_created_at ON public.contact_messages(created_at DESC);

-- =============================================================================
-- RLS — public can create, only staff (provider|admin, this project's
-- existing "COIN-IDEAL staff" convention -- see order_documents_staff_read
-- in 00023) can read/manage. WITH CHECK pins status to 'new' on insert so a
-- direct API call can't submit a message pre-marked 'read'/'archived'.
-- =============================================================================
CREATE POLICY "contact_messages_insert_public"
  ON public.contact_messages FOR INSERT
  WITH CHECK (status = 'new');

CREATE POLICY "contact_messages_staff_all"
  ON public.contact_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('provider', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('provider', 'admin')
    )
  );

-- No explicit REVOKE needed here unlike orders/payments (00028): unlike
-- money or order status, there is no server-computed value to protect on
-- INSERT -- the WITH CHECK above is sufficient, and anon/authenticated's
-- blanket grant from 00026 is the correct, standard boundary with RLS
-- doing the real work, same as every other public-writable table in this
-- schema (favorites, addresses, service_requests).
