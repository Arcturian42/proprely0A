# Supabase

## Structure

- `migrations/` — **source de vérité**. Migrations incrémentales horodatées,
  appliquées dans l'ordre alphabétique du nom de fichier
  (`YYYYMMDDHHMMSS_nom.sql`). Inclut profiles, RLS, fonctions helper
  `current_company_id()` / `current_user_role()`, et toutes les tables business.
- `schema.sql` — snapshot historique du schéma initial. **Pas tenu à jour** —
  pour bootstrap un nouvel env, applique les migrations dans l'ordre.
- `seed.sql` — données de seed optionnelles (mock data) pour un env vide.
- `audit_logs.sql` — design draft pour une table d'audit (pas encore migrée).

## Workflow

### Nouvel environnement (clean install + incrémental — même commande)

Méthode recommandée (aucune dépendance, fonctionne sur Windows) :

```bash
# Ajouter SUPABASE_ACCESS_TOKEN dans .env.local (token perso Supabase)
node scripts/db-migrate.mjs
```

Alternatives :

```bash
# Supabase CLI
supabase db push

# psql direct
for f in supabase/migrations/*.sql; do
  psql $DATABASE_URL -f "$f"
done
```

Toutes les migrations sont **idempotentes** (`CREATE … IF NOT EXISTS`,
`DROP POLICY IF EXISTS` avant chaque `CREATE POLICY`, etc.) — safe à
re-runner.

### Erreur PGRST205 (table not found in schema cache)

```bash
# Rechargement rapide du cache PostgREST + re-grant des privilèges
node scripts/db-migrate.mjs --fix-cache

# Si la table est vraiment absente, appliquer toutes les migrations
node scripts/db-migrate.mjs
```

Voir le playbook complet dans `docs/RUNBOOK.md → §7`.

### Ajouter une nouvelle migration

1. Créer `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. La rendre **idempotente** (préfixer `DROP … IF EXISTS` les policies/triggers,
   utiliser `IF NOT EXISTS` sur tables/index/colonnes)
3. Mettre à jour `src/types/index.ts` si le schéma change
4. Push — Supabase Preview rejouera toutes les migrations sur une DB fresh
   pour valider

## Source de vérité TypeScript

`src/types/index.ts` doit toujours être aligné avec `schema.sql`. Si une
migration change le schéma, mettre à jour les types TS dans le même PR.
