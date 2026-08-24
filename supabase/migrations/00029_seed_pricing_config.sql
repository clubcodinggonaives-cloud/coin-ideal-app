-- Business config for the orders/pricing foundation (00028), following the
-- same convention as 00025_seed_founding_categories.sql: this is DATA, not
-- fixtures — safe to apply to any real environment, local or production.
--
-- Every value below already exists and is already live in the product
-- today, hardcoded in src/features/document-orders/types.ts. This migration
-- does not invent a single number — it moves the existing, real values into
-- the database so they satisfy cahier des charges §4.3 ("les tarifs
-- doivent pouvoir être modifiés sans changement de code") instead of
-- requiring a frontend deploy to change.
--
-- delivery_zones is deliberately left EMPTY: the cahier des charges (§5)
-- allows delivery fees "par zone, distance ou montant fixe", but no real
-- zone list has been confirmed — only the flat fee below is a confirmed
-- real value. Seeding fake zone names would be inventing business rules,
-- which this project's own instructions rule out. Add real zones via
-- /admin once COIN-IDEAL defines them; create_order() already falls back
-- to flat_delivery_fee when no delivery_zone_id is given.
--
-- Idempotent via ON CONFLICT — safe to re-run.

INSERT INTO public.finishing_options (id, label, cost, is_active)
VALUES
  ('binding', 'Reliure', 150, true),
  ('lamination', 'Plastification', 100, true),
  ('stapling', 'Agrafage', 25, true)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  cost = EXCLUDED.cost,
  is_active = EXCLUDED.is_active;

INSERT INTO public.settings (key, value, description)
VALUES
  (
    'color_surcharge_ratio',
    '1.6',
    'Multiplicateur appliqué au prix unitaire du service quand l''impression/copie est en couleur plutôt qu''en noir et blanc. Source : COLOR_SURCHARGE_RATIO (src/features/document-orders/types.ts).'
  ),
  (
    'flat_delivery_fee',
    '250',
    'Frais de livraison forfaitaire (HTG), utilisé quand aucune zone de livraison spécifique n''est sélectionnée. Source : FLAT_DELIVERY_FEE (src/features/document-orders/types.ts). À terme, remplaçable par des tarifs par zone via la table delivery_zones.'
  ),
  (
    'order_document_retention_days',
    '30',
    'Nombre de jours après finalisation d''une commande avant suppression automatique du document associé (cahier des charges §4.2 : "par exemple 30 jours"). Valeur d''exemple du cahier des charges, appliquée telle quelle en attendant confirmation de COIN-IDEAL. TODO / À CONFIRMER : aucune tâche planifiée n''applique encore cette politique — voir Phase 5 de docs/database/DATABASE_IMPLEMENTATION_PLAN.md.'
  )
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();
