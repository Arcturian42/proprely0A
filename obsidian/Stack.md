# Stack & Structure

→ [[Home]] | Source : [`README.md`](../README.md)

---

## Technologies

| Couche | Techno |
|--------|--------|
| Framework | **Next.js 16** — App Router, Server Actions, Middleware |
| UI | **React 19** + TailwindCSS v4 + shadcn/ui + Radix |
| Base de données | **Supabase** — Postgres + Auth + Row-Level Security |
| État client | **Zustand** — hydraté depuis Supabase au mount |
| Signature | **[Docuseal](https://docuseal.com)** — devis PDF |
| Email | **[Resend](https://resend.com)** — transactionnel |
| Tests unitaires | **Vitest** |
| CI | **GitHub Actions** — lint + typecheck + test + build |
| Monitoring | **Sentry** — client + server + edge |
| Analytics | **PostHog** — opt-in, events signup/invitation |

> ⚠️ Next.js 16 a des breaking changes vs versions précédentes. Lire [`AGENTS.md`](../AGENTS.md) avant de toucher au framework.

---

## Structure du repo

```
src/
├── app/                    # Routes App Router
│   ├── (public)/           # login, signup, accept-invitation, cgu
│   ├── auth/callback/      # OAuth / magic-link callback
│   ├── actions/            # Server Actions (auth, invitations, data, members)
│   ├── api/                # Route handlers (Docuseal webhook, Sirene, health)
│   ├── dashboard/          # Tableau de bord owner/admin/sales
│   ├── commercial/         # Pipeline + clients-sites
│   ├── operations/         # Cockpit, planning, missions du jour, SOP
│   ├── rh/                 # Agents, heures & paie
│   ├── rentabilite/        # Analyse rentabilité client
│   ├── parametres/         # Entreprise, équipe
│   └── agent/              # Espace agent
├── components/
│   ├── auth/               # Can, SupabaseHydrator
│   ├── settings/           # InvitationsPanel, MembersPanel
│   └── ui/                 # shadcn primitives
├── lib/
│   ├── auth/               # RBAC matrix, server-guard, types, hooks
│   ├── email/              # Resend wrapper + templates
│   ├── supabase/           # server / client / proxy helpers
│   ├── docuseal.ts
│   └── store.ts            # Zustand store + hooks
└── types/index.ts          # Types business (Agent, Client, Mission…)

supabase/
├── migrations/             # Source de vérité du schéma
└── seed.sql

.github/workflows/ci.yml   # lint · typecheck · test · build
```

---

## Scripts utiles

```bash
npm run dev         # serveur de dev (http://localhost:3000)
npm run build       # build production
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run test:watch  # vitest --watch
```

---

## Voir aussi
- [[Architecture]] — Flux de données et multi-tenancy
- [[Dev Setup]] — Installation et variables d'env
