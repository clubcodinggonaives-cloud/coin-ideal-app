# Provider signup fix + admin approval workflow

## Résumé

Suite à la session précédente (rôle enfin correctement assigné à l'inscription),
l'opérateur a signalé que créer un compte prestataire échouait toujours, et a
demandé (1) une correction, (2) une approbation admin obligatoire avant qu'un
prestataire soit pleinement actif, et (3) deux nouveaux champs à l'inscription
prestataire : quels services il propose, et une pièce légale (patente / carte
professionnelle).

## Root cause de l'échec d'inscription

Pas un bug dans le code de la session précédente. Le compte Supabase lié
limite les emails de confirmation à **2 par heure** (`config.toml`, valeur
jamais alignée avec les réglages réels du projet distant) — quota déjà épuisé
par les tests répétés de cette session et de la précédente. Confirmé en
direct : chaque tentative renvoyait `429 over_email_send_rate_limit`.

Corrigé **sans toucher aux réglages globaux du projet** (site_url/redirect
URLs de `config.toml` sont des valeurs `127.0.0.1` de scaffold local — les
pousser telles quelles aurait cassé les redirections OAuth/production) : une
nouvelle Edge Function `register` (clé `service_role`, jamais exposée)
crée le compte via `auth.admin.createUser({ email_confirm: true })` — aucun
email de confirmation n'est plus jamais envoyé pour une inscription normale,
donc cette limite ne peut plus être atteinte. `handle_new_user()` se déclenche
à l'identique quelle que soit l'API qui insère la ligne dans `auth.users`.

## Approbation admin

`provider_profiles.is_verified` existait déjà (affiché comme badge "Vérifié")
mais ne bloquait rien. Un prestataire peut maintenant se connecter et tout
préparer (profil, services) pendant l'attente, mais **ses services
n'apparaissent sur `/services` public que si son compte est vérifié**
(`services_select_active` réécrite pour l'exiger).

**Bug réel trouvé en testant ce changement** : le bouton "Vérifier ce
prestataire" de `/admin/providers` n'a jamais fonctionné au niveau base de
données — `provider_profiles_update_own` n'autorisait que le prestataire
lui-même à modifier sa propre ligne, donc la mise à jour de l'admin touchait
silencieusement 0 ligne (aucune erreur PostgREST n'est levée sur un UPDATE
RLS qui ne matche rien). Corrigé avec la même politique admin déjà utilisée
pour `services`. Le bouton, qui ne faisait auparavant que remettre `true`
(jamais `false` malgré l'icône ShieldCheck/ShieldOff suggérant un
bascule), est maintenant un vrai bascule.

## Nouveaux champs à l'inscription prestataire

- **"Quels services proposez-vous ?"** — texte requis, devient la
  description initiale de `provider_profiles` (modifiable ensuite sur
  `/provider/profile`).
- **Pièce légale** (PDF/JPG/PNG) — téléversée dans le bucket privé existant
  `provider-documents` (créé en migration 00023, jamais branché à aucune UI
  jusqu'ici) juste après la création du compte (déjà connecté). L'admin peut
  la consulter (URL signée, 5 min) via un nouveau bouton sur
  `/admin/providers` avant de vérifier le compte.

## Vérification réelle (Playwright, navigateur réel, vrai Supabase)

- Inscription prestataire complète (champs + document) depuis un vrai
  navigateur sur `http://localhost:5173` (origine ajoutée à `ALLOWED_ORIGINS`
  aux côtés de l'URL de production, sans la retirer) : **0 erreur CORS/
  console, compte créé, connecté, redirigé vers `/provider/dashboard`.**
- `provider_profiles.description` confirmé rempli avec le texte saisi.
- Document confirmé réellement présent dans le bucket privé (vérifié côté
  serveur avec le compte admin).
- Prestataire non vérifié : peut créer un service, celui-ci **n'apparaît
  pas** sur `/services` public.
- Admin trouve le prestataire en attente, consulte son document, clique
  Vérifier → badge passe à "Vérifié" → le service devient **immédiatement
  visible** sur `/services` public.
- `npx tsc -b`, `npx oxlint`, `npm run build` : tous passent.
- Toutes les données de test (comptes, services, documents) nettoyées après
  vérification, sauf les lignes `auth.users` des comptes `*.test` elles-mêmes
  (pas de clé `service_role` disponible localement pour les supprimer —
  inoffensif, même situation que d'autres comptes QA déjà présents).

## Changement de configuration

`ALLOWED_ORIGINS` (secret Edge Functions, partagé par `ai-assistant` et
`register`) mis à jour pour inclure `http://localhost:5173` et
`http://127.0.0.1:5173` en plus de l'URL de production — l'ancienne valeur
ne semblait contenir que l'URL de production, ce qui bloquait tout test
local par CORS. L'URL de production reste inchangée dans la liste.

## Fichiers modifiés

4 migrations (`00057`-`00059` + la fonction `register`), `auth.service.ts`,
`use-auth.tsx`, `validators.ts`, `register.tsx`, `uploads.service.ts`,
`admin.service.ts`, `use-admin.ts`, `admin/providers.tsx`.

## Verdict

Fonctionnel de bout en bout, vérifié avec de vraies interactions navigateur
et de vraies données sur le projet lié `qqibjglnvcezqbogkvlg`.
