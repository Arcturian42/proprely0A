# Architecture

→ [[Home]] | Source complète : [`README.md`](../README.md)

---

## Vue d'ensemble

```
Browser ──▶ Vercel (Next.js 16) ──▶ Supabase (Postgres + Auth + RLS)
                │
                ├──▶ Docuseal  (signature électronique)
                ├──▶ Resend    (emails transactionnels)
                ├──▶ SIRENE    (recherche entreprises FR)
                └──▶ Sentry    (error + perf monitoring)
```

---

## Multi-tenancy

- **1 owner = 1 entreprise**. Le signup crée `auth.users` ⇄ `companies` + profil `owner`.
- **5 collaborateurs max** par entreprise (admin / sales / agent), enforced par trigger Postgres `SEAT_LIMIT_REACHED` + validation applicative.
- Désactiver un membre libère son siège.
- **Isolation stricte** : RLS `company_id = current_company_id()` sur toutes les tables business. Un user ne voit jamais les données d'une autre entreprise.

---

## Flux de données

Les pages lisent depuis le **store Zustand** ([`src/lib/store.ts`](../src/lib/store.ts)), hydraté au mount par [`SupabaseHydrator`](../src/components/auth/SupabaseHydrator.tsx) via `loadCompanyData()`.

**Snapshots par rôle** (isolation des données sensibles) :
| Rôle | Snapshot |
|------|----------|
| owner / admin | `loadFullSnapshot` — tout |
| sales | `loadSalesSnapshot` — pas de `time_entries`, `hourly_cost` redacté |
| agent | `loadAgentSnapshot` — missions self uniquement, heures scopées self |

**Mutations optimistes** : le store est mis à jour immédiatement, puis mirroré vers Supabase en background via les server actions. Toast d'erreur si l'écriture échoue.

---

## Mode dummy

Sans `NEXT_PUBLIC_SUPABASE_URL`, le store démarre avec des mock data → dev offline possible.

---

## Voir aussi
- [[RBAC & Permissions]] — Système de rôles détaillé
- [[Database]] — Supabase + RLS
- [[Stack]] — Technos et structure des fichiers
