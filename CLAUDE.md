# CLAUDE.md

Ce fichier encadre la façon dont Claude travaille sur COIN-IDEAL. Il est chargé
automatiquement à chaque session — chaque changement dans ce projet doit le respecter.

## Rôles

- **Utilisateur** — DevOps / responsable technique du projet COIN-IDEAL (pas
  GUY Petit-Homme lui-même, qui est le propriétaire réel de l'entreprise et
  n'intervient pas techniquement). C'est l'utilisateur qui décide de l'ordre des
  phases de travail, qui détient les accès (Supabase Cloud, Vercel, clés API), et
  qui approuve les actions à risque.
- **Claude** — assistant d'implémentation. Exécute les phases de travail données
  par l'utilisateur, dans l'ordre demandé, sans dépasser le périmètre indiqué sans
  qu'on le demande explicitement.

## Stack

React 19 + TypeScript + Vite + Tailwind CSS v4 · Supabase (Auth, Postgres, Storage,
Edge Functions) · React Router v7 · TanStack Query v5 · React Hook Form + Zod ·
Déploiement Vercel. Détail complet dans `README.md`.

## Règles de travail établies

1. **Committer et pousser après chaque implémentation/modification** — sans
   attendre qu'on le demande à chaque fois. Des commits séparés et cohérents
   (par domaine : base de données, frontend, documentation) plutôt qu'un seul
   gros commit.
2. **Ne jamais fabriquer un résultat de test.** Si quelque chose est bloqué
   (Docker indisponible, pas de vraie clé API, pas d'accès à un projet distant),
   le dire clairement — jamais inventer un PASS ou un chiffre.
3. **Valider une migration localement avant de la pousser en distant**
   (`supabase db reset` via le stack Docker local) quand c'est possible. Si
   Docker est indisponible, `supabase db push --dry-run --linked` reste possible
   (aucun besoin de Docker, seulement une connexion réseau) — mais ne jamais
   exécuter le push réel sans avoir montré le plan (`--dry-run`) et obtenu une
   confirmation explicite.
4. **Ne jamais toucher un projet Supabase dont l'identité n'est pas confirmée.**
   Incident réel : le CLI de la machine de développement était connecté à un
   compte différent, ne voyant qu'un projet "NKDELIVERI" sans rapport avec
   COIN-IDEAL — jamais lié, jamais poussé. Le seul projet légitime est
   `qqibjglnvcezqbogkvlg` ("coin-ideal-app").
5. **Ne jamais demander à l'utilisateur de coller un secret dans le chat**
   (clé Gemini, mot de passe, service_role key). Les secrets se configurent via
   le terminal de l'utilisateur (`supabase secrets set ...`), jamais via une
   valeur transmise dans la conversation.
6. **Ne jamais modifier une migration déjà validée sans nécessité réelle
   démontrée** — préférer une nouvelle migration "forward" qui corrige ou
   étend, plutôt que réécrire l'historique.
7. **La sécurité passe avant la fonctionnalité.** RLS sur chaque table, jamais
   de `USING (true)` sans justification écrite, jamais de prix/statut/rôle
   envoyé par le client sans recalcul ou validation côté serveur (RPC
   `SECURITY DEFINER`). Voir `docs/database/RLS_MATRIX.md`.
8. **QA responsive/E2E = captures Playwright réelles et interactions
   navigateur réelles**, jamais une simple relecture de classes Tailwind.
9. **Respecter strictement le périmètre et l'ordre donné dans une phase de
   travail** (ex. "ne commence pas le marketplace", "STOP après le rapport").
   Ne pas anticiper les phases suivantes sans que ce soit demandé.
10. **Chaque phase de travail significative produit un rapport** dans
    `docs/phase-X/` : ce qui a été fait, ce qui est bloqué, résultats de tests
    réels, verdict PASS/FAIL ou GO/NO-GO honnête.
11. **L'utilisateur communique parfois en créole haïtien** — répondre dans la
    même langue quand on m'écrit en créole ; français sinon.

## Base de données

Schéma, RLS, Storage, plan d'implémentation : voir `docs/database/`. Migrations dans
`supabase/migrations/`, numérotées séquentiellement (`00001`…), jamais renumérotées
a posteriori. Écritures sensibles (prix, statuts de commande, paiements) passent
exclusivement par des RPC `SECURITY DEFINER` (`create_order`, `update_order_status`,
`record_payment`) — jamais d'écriture directe sur `orders`/`payments` depuis le
frontend (voir le `REVOKE` dans `00028_create_orders_payments_pricing.sql`).

## Architecture du site

Routes, structure des dossiers (`src/features/`, `src/pages/`, `src/services/`) et
tables Supabase : voir `README.md`. Mapping fonctionnalité → table → RLS → Storage :
voir `docs/database/FRONTEND_DATABASE_MAPPING.md`.

## Commandes utiles

```bash
npm run dev          # serveur de développement
npm run build         # build production
npx tsc -b            # typecheck
npx oxlint             # lint
npx supabase start --ignore-health-check   # stack Supabase local (nécessite Docker)
npx supabase db reset                        # réapplique toutes les migrations en local
npx supabase db push --linked --dry-run      # prévisualise ce qui serait poussé en distant
npx supabase functions deploy ai-assistant   # déploie une Edge Function précise
```

## Historique des phases

`docs/phase-4/` (QA responsive + E2E), `docs/phase-5/` (production readiness,
déploiement Gemini) — chaque rapport documente ce qui a été validé, avec preuves
(captures d'écran, sorties de commandes réelles), pas seulement des affirmations.
