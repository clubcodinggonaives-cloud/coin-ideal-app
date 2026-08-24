-- Phase 5B, Step 4 ("abusive payload size"): the frontend's zod schema
-- (contactSchema, src/lib/validators.ts) caps field lengths, but that's a
-- browser-only guard -- a direct REST call (exactly what this migration's
-- own QA testing did with curl) bypasses it entirely. Matches this
-- project's established pattern of never trusting client-side validation
-- alone for anything reachable by an anonymous, unauthenticated caller
-- (see ai-assistant's MAX_MESSAGE_LENGTH enforced server-side, not just in
-- the chat widget). Limits mirror the zod schema's own caps so a message
-- that passes the UI never gets rejected by the database.
ALTER TABLE public.contact_messages
  ADD CONSTRAINT contact_messages_name_length CHECK (char_length(name) BETWEEN 2 AND 100),
  ADD CONSTRAINT contact_messages_email_length CHECK (char_length(email) <= 255),
  ADD CONSTRAINT contact_messages_subject_length CHECK (char_length(subject) BETWEEN 3 AND 200),
  ADD CONSTRAINT contact_messages_message_length CHECK (char_length(message) BETWEEN 10 AND 2000);
