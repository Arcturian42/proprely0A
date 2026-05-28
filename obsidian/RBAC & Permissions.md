# RBAC & Permissions

→ [[Home]] | [[Architecture]]

---

## Rôles (4 niveaux)

| Rôle | Permissions |
|------|-------------|
| `owner` | Tout, y compris `company:write` et transfert de propriété |
| `admin` | Tout sauf `company:write` |
| `sales` | Pipeline, devis, clients, sites · lecture agents/missions/analytics |
| `agent` | Lecture missions + SOPs, lecture/écriture de ses propres heures |

Matrice complète → [`src/lib/auth/rbac.ts`](../src/lib/auth/rbac.ts)

---

## Enforcement

### Côté serveur (Server Actions)
[`src/lib/auth/server-guard.ts`](../src/lib/auth/server-guard.ts) — `requirePermission()` dans chaque server action sensible.

### Côté page (layout server)
`requirePagePermission()` dans les layouts server :
- `/commercial` → `opportunity:read`
- `/operations` → `mission:read`
- `/rh` → `agent:read`
- `/rh/heures-paie` → `time:read`
- `/rentabilite` → `analytics:read`

### Côté client (composant)
[`<Can permission="…">`](../src/components/auth/Can.tsx) — conditional render selon le rôle.

### Middleware (proxy)
[`src/proxy.ts`](../src/proxy.ts) — redirige les profils `is_active=false` vers `/login?error=access_denied`.

---

## Isolation des données par rôle

Les snapshots Supabase sont différents selon le rôle (voir [[Architecture#Flux de données]]) :
- **owner/admin** : tout visible
- **sales** : `hourly_cost` redacté, pas de `time_entries`
- **agent** : uniquement ses propres missions et heures, `hourly_cost` masqué

---

## RLS (Row-Level Security)

Toutes les tables business ont `FORCE ROW LEVEL SECURITY` + policy `company_id = current_company_id()`.

Helpers SQL : `current_company_id()` et `current_user_role()` dans les migrations Supabase.

---

## Voir aussi
- [[Architecture]] — Multi-tenancy et isolation
- [[Database]] — RLS détaillé côté Postgres
