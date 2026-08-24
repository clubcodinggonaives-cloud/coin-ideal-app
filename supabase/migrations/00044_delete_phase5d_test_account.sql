-- Deletes the leftover Phase 5D QA registration test account
-- ("Phase5D Tester", coin-ideal-phase5d-qa-1787596297689@gmail.com),
-- flagged in docs/phase-5/PHASE_5D_VERCEL_STAGING_REPORT.md as harmless
-- residue left for the account owner's call — requested explicitly here.
-- No orders, payments, or contact_messages reference this account
-- (verified via REST before writing this migration). Deleting the
-- auth.users row cascades through profiles and any dependents per the
-- existing ON DELETE CASCADE foreign keys.
DELETE FROM auth.users WHERE email = 'coin-ideal-phase5d-qa-1787596297689@gmail.com';
