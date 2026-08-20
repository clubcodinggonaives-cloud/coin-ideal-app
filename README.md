# COIN-IDEAL

Plateforme multi-service permettant aux utilisateurs de découvrir, rechercher et réserver différents services proposés par des prestataires.

## Stack technique

- **Frontend** : React 19 + TypeScript + Vite 8 + Tailwind CSS v4
- **Backend** : Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- **Routing** : React Router v7
- **State** : TanStack Query v5
- **Forms** : React Hook Form + Zod
- **Icons** : Lucide React
- **Déploiement** : Vercel

## Démarrage rapide

### Prérequis

- Node.js 18+
- npm ou yarn
- Compte Supabase

### Installation

```bash
npm install
```

### Configuration

Copiez le fichier `.env.example` en `.env` et remplissez vos variables :

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon
```

### Développement

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Base de données

### Migrations Supabase

Les migrations SQL se trouvent dans `supabase/migrations/`. Pour les appliquer :

1. Créer un projet Supabase
2. Installer le CLI Supabase : `npm i -g supabase`
3. Lier le projet : `supabase link --project-ref <your-project-ref>`
4. Appliquer les migrations : `supabase db push`

### Tables

| Table | Description |
|-------|-------------|
| `profiles` | Profils utilisateurs (auto-créé via trigger) |
| `provider_profiles` | Profils professionnels |
| `categories` | Catégories de services |
| `services` | Services proposés |
| `service_images` | Images des services |
| `service_availability` | Disponibilités |
| `addresses` | Adresses utilisateurs |
| `service_requests` | Demandes de service |
| `bookings` | Réservations |
| `favorites` | Favoris |
| `reviews` | Avis clients |
| `message_threads` | Threads de conversation |
| `messages` | Messages |
| `notifications` | Notifications |
| `reports` | Signalements |
| `admin_logs` | Logs administrateur |

### RLS (Row Level Security)

RLS est activé sur toutes les tables. Les policies garantissent :

- Client : accès à ses propres données uniquement
- Prestataire : gestion de ses services et demandes associées
- Admin : permissions étendues via fonction `is_admin()`

## Architecture

```
src/
├── app/              # Router, providers, config
├── components/       # Composants réutilisables
│   ├── ui/           # Design system (Button, Card, Input...)
│   ├── layout/       # Navbar, Footer, Sidebar
│   ├── forms/        # Champs de formulaire
│   └── shared/       # ServiceCard, ProviderCard, etc.
├── features/         # Modules feature-based
│   ├── auth/         # Authentification
│   ├── services/     # Gestion des services
│   ├── providers/    # Gestion des prestataires
│   ├── bookings/     # Réservations
│   ├── reviews/      # Avis
│   ├── notifications/# Notifications
│   ├── messages/     # Messagerie
│   ├── favorites/    # Favoris
│   └── admin/        # Administration
├── pages/            # Pages (public, auth, dashboard, provider, admin)
├── services/         # Couche d'accès aux données Supabase
├── hooks/            # Hooks réutilisables
├── types/            # Types TypeScript
├── lib/              # Constantes, validators, erreurs
└── utils/            # Utilitaires (format, cn, helpers)
```

## Routes

### Public
- `/` — Accueil
- `/services` — Liste des services
- `/services/:category` — Catégorie
- `/service/:id` — Détail service
- `/providers` — Liste des prestataires
- `/provider/:id` — Détail prestataire
- `/about` — À propos
- `/contact` — Contact

### Auth
- `/auth/login` — Connexion
- `/auth/register` — Inscription
- `/auth/forgot-password` — Mot de passe oublié
- `/auth/reset-password` — Réinitialisation

### Client Dashboard
- `/dashboard` — Vue d'ensemble
- `/dashboard/requests` — Mes demandes
- `/dashboard/bookings` — Mes réservations
- `/dashboard/favorites` — Favoris
- `/dashboard/messages` — Messages
- `/dashboard/notifications` — Notifications
- `/dashboard/settings` — Paramètres

### Prestataire
- `/provider/dashboard` — Tableau de bord
- `/provider/services` — Mes services
- `/provider/services/new` — Nouveau service
- `/provider/requests` — Demandes
- `/provider/bookings` — Réservations
- `/provider/earnings` — Revenus
- `/provider/reviews` — Avis
- `/provider/profile` — Profil professionnel

### Admin
- `/admin` — Tableau de bord
- `/admin/users` — Utilisateurs
- `/admin/providers` — Prestataires
- `/admin/services` — Services
- `/admin/categories` — Catégories
- `/admin/requests` — Demandes
- `/admin/reviews` — Avis
- `/admin/settings` — Paramètres

## Déploiement Vercel

1. Pousser le code sur GitHub
2. Importer le projet sur Vercel
3. Configurer les variables d'environnement :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Le framework Vite est détecté automatiquement
5. Le rewriting SPA est configuré dans `vercel.json`

## Variables d'environnement

| Variable | Description | Obligatoire |
|----------|-------------|-------------|
| `VITE_SUPABASE_URL` | URL du projet Supabase | Oui |
| `VITE_SUPABASE_ANON_KEY` | Clé anonyme Supabase | Oui |

**Jamais** de `SUPABASE_SERVICE_ROLE_KEY` dans le frontend.

## Licence

Propriétaire — COIN-IDEAL
