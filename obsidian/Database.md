# Database — Supabase

→ [[Home]] | Source : [`supabase/README.md`](../supabase/README.md)

---

## Structure

```
supabase/
├── migrations/    ← source de vérité (horodatées YYYYMMDDHHMMSS_nom.sql)
├── seed.sql       ← mock data pour env vide (optionnel)
└── schema.sql     ← snapshot historique initial (non maintenu)
```

Les migrations sont **idempotentes** (`CREATE … IF NOT EXISTS`, `DROP POLICY IF EXISTS`) — safe à rejouer.

---

## Appliquer les migrations

```bash
# Avec le CLI Supabase
supabase db push

# Ou en pur SQL (en ordre alphabétique)
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -f "$f"
done
```

---

## Tables principales

| Table | Description |
|-------|-------------|
| `companies` | Une ligne par entreprise (tenant) |
| `profiles` | Utilisateurs liés à une company (`owner/admin/sales/agent`) |
| `missions` | Missions de nettoyage avec statuts |
| `mission_agents` | Jointure many-to-many missions ↔ agents |
| `opportunities` | Pipeline commercial (leads → devis → signés) |
| `quotes` | Devis avec numéro séquentiel `DEV-YYYY-NNNN` |
| `time_entries` | Heures pointées par les agents |
| `notifications` | Notifications in-app (RLS scopée `recipient_id`) |
| `audit_logs` | Journal d'audit sur 6 tables (triggers PG) |
| `invitations` | Invitations email en attente d'acceptation |
| `onboarding_status` | Progression onboarding par entreprise |

---

## Fonctions helper (SQL)

- `current_company_id()` — company_id de l'utilisateur connecté
- `current_user_role()` — rôle de l'utilisateur connecté
- `generate_quote_number(company_id, year)` — numéro atomique par entreprise/année

---

## Real-time

Supabase Realtime activé sur :
- `missions` → `useRealtimeMissions` hook (dashboard + cockpit + missions-du-jour)
- `notifications` → `<NotificationBell>` (poll fallback 60s si WS indisponible)

> Vérifier dans Supabase Dashboard → Database → Replication que ces tables sont activées.

---

## Migrations clés

| Migration | Contenu |
|-----------|---------|
| `20260519000000_soft_delete.sql` | Soft delete clients/sites/agents (`archived_at`) |
| `20260520000000_quote_number_sequence.sql` | Séquence atomique numéros devis |
| `20260520000002_notifications.sql` | Table notifications + RLS |
| `20260520000003_mission_issue_and_lost_reason.sql` | Colonnes issue + lost_reason |
| `20260520000004_rls_force_and_audit_extend.sql` | FORCE RLS sur 22 tables, audit étendu |

---

## Voir aussi
- [[Architecture]] — Flux de données
- [[RBAC & Permissions]] — RLS par rôle
- [[Deployment]] — Appliquer les migrations en prod
