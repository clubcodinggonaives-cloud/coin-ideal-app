-- COIN-IDEAL is a single-owner business — Guy Petit-Homme is both the
-- staff processing orders (/provider/*) and the person who needs full
-- system access (pricing config, user management, contact messages,
-- /admin/*). `role = 'admin'` is a strict superset of `role = 'provider'`
-- for route access (DashboardLayout's provider guard already allows
-- role IN ('provider', 'admin')), so upgrading here doesn't remove any
-- capability 00037 granted — it adds the admin-only surfaces on top.
--
-- Runs as a direct/superuser connection, same as 00037 — allowed by the
-- 00027 role-change guard trigger for the same documented reason.
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'clubcodinggonaives@gmail.com';
