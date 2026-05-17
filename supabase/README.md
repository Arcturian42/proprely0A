# Supabase

## Structure

- `schema.sql` — snapshot canonique du schéma à jour (= état après application
  de toutes les migrations). Utilisé pour bootstrap d'un nouvel environnement
  (local dev, CI).
- `migrations/` — migrations incrémentales horodatées. Ordre = ordre alphabétique
  du nom de fichier (`YYYYMMDDHHMMSS_nom.sql`).

## Workflow

### Nouvel environnement (clean install)

```bash
psql $DATABASE_URL -f supabase/schema.sql
```

### Environnement existant (incrémental)

Appliquer dans l'ordre les migrations non encore exécutées :

```bash
for f in supabase/migrations/*.sql; do
  psql $DATABASE_URL -f "$f"
done
```

Si tu utilises le Supabase CLI :

```bash
supabase db push
```

### Ajouter une nouvelle migration

1. Créer un fichier `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Mettre à jour `supabase/schema.sql` pour refléter le nouvel état canonique
3. Vérifier que les deux sont cohérents (un nouvel environnement bootstrappé
   via `schema.sql` doit donner le même résultat qu'un ancien environnement
   ayant appliqué la nouvelle migration)

## Source de vérité TypeScript

`src/types/index.ts` doit toujours être aligné avec `schema.sql`. Si une
migration change le schéma, mettre à jour les types TS dans le même PR.
