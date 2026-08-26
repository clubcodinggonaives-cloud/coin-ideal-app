-- Lets staff record a reply to a contact message. No email-sending
-- integration exists anywhere in this stack (see 00034's own comment) --
-- the reply is stored here for the record and the admin UI opens a
-- mailto: link to actually send it, rather than inventing a fake "sent"
-- state with no real delivery behind it.
ALTER TABLE public.contact_messages
  ADD COLUMN admin_reply TEXT,
  ADD COLUMN replied_at TIMESTAMPTZ;
