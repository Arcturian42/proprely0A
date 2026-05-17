# Proprely Admin

SaaS de gestion pour entreprises de propreté — pipeline commercial, planning
des missions, gestion d'agents, devis avec signature électronique.

## Stack

- **Next.js 16** (App Router, Server Actions, Proxy/Middleware)
- **React 19** + TailwindCSS v4 + [shadcn/ui](https://ui.shadcn.com) + Radix
- **Supabase** — Postgres + Auth magic link + Row-Level Security
- **Zustand** — store client hydraté depuis Supabase au mount
- **[Docuseal](https://docuseal.com)** — signature électronique des devis
- **[Resend](https://resend.com)** — emails transactionnels
- **Vitest** — tests unitaires · GitHub Actions — CI (lint + typecheck + test + build)

## Architecture

### Multi-tenant

- **1 utilisateur owner = 1 entreprise**. Le signup self-serve crée le couple
  `auth.users` ⇄ `companies` + un profil `owner` lié.
- **5 collaborateurs max** par entreprise (admin / sales / agent), enforced à
  la fois côté Postgres (trigger `SEAT_LIMIT_REACHED`) et côté application.
  Désactiver un membre libère son siège.
- **Isolation stricte** : toutes les tables business ont une RLS policy
  `company_id = current_company_id()` — un user ne peut jamais voir/modifier
  les données d'une autre entreprise, même via les server actions.

### RBAC (4 rôles)

| Rôle | Permissions |
|---|---|
| `owner` | Tout, y compris `company:write` et transfert de propriété |
| `admin` | Tout sauf `company:write` |
| `sales` | Pipeline, devis, clients, sites · lecture agents/missions/analytics |
| `agent` | Lecture missions + SOPs, lecture/écriture de ses propres heures |

Matrice complète : [`src/lib/auth/rbac.ts`](src/lib/auth/rbac.ts).
Enforcement server-side : [`src/lib/auth/server-guard.ts`](src/lib/auth/server-guard.ts)
(`requirePermission()` dans chaque server action sensible).
Composant client : [`<Can permission="…">`](src/components/auth/Can.tsx).

### Données

Les pages lisent depuis le store Zustand
([`src/lib/store.ts`](src/lib/store.ts)), hydraté au mount par
[`SupabaseHydrator`](src/components/auth/SupabaseHydrator.tsx) à partir
d'un snapshot pré-fetché côté serveur via
[`loadCompanyData()`](src/app/actions/data.ts).

Les mutations sont **optimistes** : on update le store immédiatement, puis
on miroir vers Supabase en background via les server actions CRUD
(`upsertX` / `deleteX`). Toast d'erreur si l'écriture échoue.

En **mode dummy** (sans `NEXT_PUBLIC_SUPABASE_URL`), le store démarre avec
des mock data pour permettre le dev offline.

## Setup local

### 1. Installer

```bash
npm install
cp .env.example .env.local
# Remplir .env.local — voir détail des variables ci-dessous
```

### 2. Variables d'environnement

| Var | Requis | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | optionnel | Vide = mode dummy (mock data) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | optionnel | Idem |
| `SUPABASE_SERVICE_ROLE_KEY` | requis si Supabase | Server-side uniquement (signup, invitations) |
| `NEXT_PUBLIC_APP_URL` | requis si Supabase | Base URL utilisée dans les magic links |
| `DOCUSEAL_API_KEY` | requis pour signature | [Console Docuseal](https://console.docuseal.com) |
| `RESEND_API_KEY` | requis pour emails | [resend.com/api-keys](https://resend.com/api-keys) |
| `RESEND_FROM` | optionnel | Sender custom (sinon sandbox `onboarding@resend.dev`) |

### 3. Bootstrap Supabase

Appliquer les migrations sur ta base :

```bash
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -f "$f"
done
```

Ou avec le CLI Supabase : `supabase db push`. Toutes les migrations sont
idempotentes (`CREATE … IF NOT EXISTS`, `DROP POLICY IF EXISTS`, etc.).

Détail dans [`supabase/README.md`](supabase/README.md).

### 4. Lancer

```bash
npm run dev
# → http://localhost:3000
```

## Scripts

```bash
npm run dev         # serveur de dev Next.js
npm run build       # build production
npm start           # lance le build prod
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # vitest run (24 tests)
npm run test:watch  # vitest --watch
```

## Layout du repo

```
src/
├── app/                       # routes App Router
│   ├── (public)/              # login, signup, accept-invitation, cgu, …
│   ├── auth/callback/         # OAuth/magic-link callback (hors route group)
│   ├── actions/               # server actions (auth, invitations, data, members)
│   ├── api/                   # route handlers (Docuseal webhook, Sirene, dev)
│   ├── dashboard/             # tableau de bord owner/admin/sales
│   ├── commercial/            # pipeline + clients-sites
│   ├── operations/            # cockpit, planning, missions du jour, SOP
│   ├── rh/                    # agents, heures & paie
│   ├── rentabilite/           # analyse, rentabilité client
│   ├── parametres/            # entreprise, équipe (invitations + membres)
│   └── agent/                 # espace agent (mes missions, mon agenda)
├── components/
│   ├── auth/                  # Can, SupabaseHydrator
│   ├── settings/              # InvitationsPanel, MembersPanel
│   └── ui/                    # shadcn primitives
├── lib/
│   ├── auth/                  # rbac matrix, server-guard, types, hooks
│   ├── email/                 # Resend wrapper + templates
│   ├── supabase/              # server / client / proxy helpers
│   ├── docuseal.ts            # wrapper signature
│   └── store.ts               # Zustand store + hooks
└── types/index.ts             # types business (Agent, Client, Mission, …)

supabase/
├── migrations/                # source de vérité du schéma (idempotent)
└── seed.sql                   # données dev (safe sur preview vide)

.github/workflows/ci.yml       # lint · typecheck · test · build sur PR
```

## Docs internes

- [`AGENTS.md`](AGENTS.md) — conventions de dev (heads-up : Next.js 16 a
  des breaking changes vs. les versions précédentes)
- [`BRANCHES.md`](BRANCHES.md) — stratégie de branches, archives, roadmap
- [`supabase/README.md`](supabase/README.md) — workflow migrations

## Déploiement

Déployé sur Vercel — chaque PR génère une preview avec son propre
environnement Supabase Preview. Le merge sur `main` déploie en production.

Les variables d'env doivent être configurées côté Vercel (Project Settings
→ Environment Variables) avec les mêmes clés que `.env.example`.
