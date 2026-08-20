-- Founding service categories for COIN-IDEAL, per the cahier des charges
-- (section 1: "Activites: Impression / Copie — Vente d'eau"; section 4.1
-- catalogue). This is data, not fixtures — safe to apply to any real
-- environment (local or production): no fake prices, no fake accounts,
-- just the three category labels the whole product is built around.
--
-- Idempotent via ON CONFLICT (slug) — re-running only refreshes the
-- description/icon/is_active columns, never creates duplicates.

INSERT INTO public.categories (name, slug, description, icon, is_active)
VALUES
  (
    'Impression',
    'impression',
    'Impression noir & blanc ou couleur, formats A4/A3, simple face ou recto-verso.',
    'printer',
    true
  ),
  (
    'Copie',
    'copie',
    'Copie noir & blanc ou couleur de vos documents, à l''unité ou en grande quantité.',
    'copy',
    true
  ),
  (
    'Vente d''eau',
    'vente-eau',
    'Produits d''eau disponibles à COIN-IDEAL — vitrine publicitaire, sans commande en ligne.',
    'droplets',
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_active = EXCLUDED.is_active;
