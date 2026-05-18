# Supabase test seed

`supabase/seed.sql` populates a deterministic dataset used by Playwright E2E
specs (`e2e/auth-seeded.spec.ts`) and manual QA on a Supabase **preview**
project. Do not run this on production.

## What's inside

- 1 company `Proprely Nettoyage Pro` (id `11111111-…`)
- 1 owner profile `Marie Dupont` linked to `owner@proprely.fr`
- onboarding marked complete (so tests skip the wizard)
- 1 `company_pricing_settings` row (22.5€/h, 35% margin, 20% VAT)
- 2 `service_types` (Nettoyage de bureaux, Nettoyage de vitres) + matching
  `pricing_rules` so QuoteFlow's "Tes règles" badge fires
- 2 clients (`Tech Lyon SARL`, `Cabinet Médical Bastille`), 2 sites
- 2 agents (`Sophie Martin`, `Karim Benali`)
- 3 missions (today, tomorrow, next week) with agent assignments
- 2 opportunities (one `decouverte`, one `proposition`)

All inserts are `ON CONFLICT DO NOTHING` so re-running is safe.

## How to apply

### 1. Provision the auth user

The `auth.users` row referenced by `profiles.id` (`aaaaaaaa-…-aaa1`) must
exist *before* `seed.sql` runs. Two options:

**a. Via the Supabase dashboard** — Authentication > Users > Add user.
Email: `owner@proprely.fr`. Confirm email. Copy the generated UUID
into `seed.sql` if it differs from `aaaaaaaa-0000-0000-0000-000000000001`.

**b. Via the script** — needs your service role key:

```bash
SUPABASE_URL=https://<project>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
npx tsx scripts/seed-test-auth-users.ts
```

### 2. Apply migrations

```bash
supabase db push
# or via the dashboard SQL editor
```

### 3. Apply the seed

```bash
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
# or paste seed.sql into the dashboard SQL editor
```

### 4. Run the E2E specs

```bash
PLAYWRIGHT_SUPABASE_SEEDED=1 \
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key> \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
npm run test:e2e -- e2e/auth-seeded.spec.ts
```

## CI integration (TODO)

Wire `PLAYWRIGHT_SUPABASE_SEEDED=1` + the three env vars above to a
preview Supabase project secret in GitHub Actions. The seed script is
idempotent so it's safe to call before every test run.

The login step (Supabase magic-link) isn't automated yet — see
`e2e/auth-seeded.spec.ts` describe block for the contract these specs
will exercise once we add a programmatic session helper (e.g.
service-role-signed JWT pasted in `auth-storage-key` localStorage).
