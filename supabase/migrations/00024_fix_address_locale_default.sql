-- addresses.country defaulted to 'Cote d Ivoire' (00010_create_addresses.sql),
-- a leftover from the template this project started from. COIN-IDEAL operates
-- in Haiti (cahier des charges: Ruelle Sajous, Gonaives, Haiti). Only the
-- default changes here — existing rows, if any, are left untouched since we
-- cannot know whether a given address was deliberately set otherwise.
ALTER TABLE public.addresses
  ALTER COLUMN country SET DEFAULT 'Haïti';
