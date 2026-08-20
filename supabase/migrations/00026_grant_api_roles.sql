-- None of the previous 25 migrations contain a single GRANT statement, and
-- recent Supabase projects default new tables to NOT being exposed to the
-- API roles (`auto_expose_new_tables` — see supabase/config.toml). Without
-- this, `anon`/`authenticated` have no table-level privileges at all, so
-- every frontend query fails with a permission error regardless of how
-- correct the RLS policies are: GRANTs decide whether a role may touch the
-- table at all, RLS decides which *rows* it may see once it can.
--
-- This is the standard Supabase pattern: grant broadly here, let RLS
-- policies (00020_create_rls_policies.sql) be the actual authorization
-- boundary — which this schema already has, table by table.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Apply the same defaults to tables/sequences/functions created by future
-- migrations, so this doesn't silently regress the next time someone adds
-- a table and forgets this file exists.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
