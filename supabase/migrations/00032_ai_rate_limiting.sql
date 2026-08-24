-- Durable rate limiting for the ai-assistant Edge Function.
--
-- The function's existing in-memory limiter (a Map, per the scaffold's own
-- documented "LIMITES CONNUES" footer) resets on every cold start and is
-- never shared across function instances/regions — meaningless protection
-- against real abuse of a metered, paid external API (Gemini). Phase 5
-- production audit (§11: "Ajouter rate limiting si l'architecture actuelle
-- le permet") — it does, now that the project has a full database to back
-- it with.
--
-- No RLS policy is added deliberately: nothing should read or write this
-- table directly, only through check_ai_rate_limit() below, which is
-- SECURITY DEFINER specifically so anon (unauthenticated site visitors —
-- the assistant is public per cahier des charges §7) can call it without
-- needing table-level grants that would let a visitor tamper with anyone's
-- counter directly.
CREATE TABLE public.ai_rate_limits (
  rate_key      TEXT PRIMARY KEY,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_rate_limits FROM anon, authenticated;

-- Fixed-window counter, keyed by whatever the caller identifies the
-- requester with (authenticated user id if logged in, else a hash of their
-- IP — see the Edge Function). Returns true if the request is allowed.
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  p_key TEXT,
  p_max_requests INT DEFAULT 10,
  p_window_seconds INT DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    RAISE EXCEPTION 'p_key is required.';
  END IF;

  SELECT * INTO v_row FROM public.ai_rate_limits WHERE rate_key = p_key FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.ai_rate_limits (rate_key, window_start, request_count)
    VALUES (p_key, now(), 1);
    RETURN true;
  END IF;

  IF now() - v_row.window_start > make_interval(secs => p_window_seconds) THEN
    UPDATE public.ai_rate_limits SET window_start = now(), request_count = 1 WHERE rate_key = p_key;
    RETURN true;
  END IF;

  IF v_row.request_count >= p_max_requests THEN
    RETURN false;
  END IF;

  UPDATE public.ai_rate_limits SET request_count = request_count + 1 WHERE rate_key = p_key;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_ai_rate_limit(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(TEXT, INT, INT) TO anon, authenticated;

-- Old rows are cheap to keep (one row per rate-limit key, overwritten in
-- place every window) but harmless to prune periodically; not automated
-- here — a manual `DELETE ... WHERE window_start < now() - interval '1 day'`
-- or a scheduled job is a Phase 6+ concern, not a correctness requirement.
