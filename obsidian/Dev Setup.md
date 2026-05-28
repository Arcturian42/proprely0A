# Dev Setup

→ [[Home]] | [[Stack]]

---

## Installation

```bash
npm install
cp .env.example .env.local
# Remplir .env.local (voir table ci-dessous)
```

---

## Variables d'environnement

| Variable | Requis | Description |
|----------|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | optionnel | Vide = mode dummy (mock data) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | optionnel | Idem |
| `SUPABASE_SERVICE_ROLE_KEY` | si Supabase | Server-side uniquement |
| `NEXT_PUBLIC_APP_URL` | si Supabase | Base URL pour les magic links |
| `DOCUSEAL_API_KEY` | pour signature | [console.docuseal.com](https://console.docuseal.com) |
| `DOCUSEAL_WEBHOOK_SECRET` | pour signature | Secret Docuseal → Webhooks |
| `RESEND_API_KEY` | pour emails | [resend.com/api-keys](https://resend.com/api-keys) |
| `RESEND_FROM` | optionnel | Sender custom (sinon sandbox) |
| `CRON_SECRET` | pour crons Vercel | `openssl rand -hex 32` |
| `NEXT_PUBLIC_SENTRY_DSN` | monitoring | sentry.io → Client Keys |
| `SENTRY_DSN` | monitoring | même valeur |
| `SENTRY_AUTH_TOKEN` | monitoring | sentry.io → Auth Tokens |
| `SENTRY_ORG` | monitoring | slug org Sentry |
| `SENTRY_PROJECT` | monitoring | slug projet Sentry |
| `NEXT_PUBLIC_POSTHOG_KEY` | analytics | posthog.com → Project settings |
| `HEALTH_SECRET` | health endpoint | `openssl rand -hex 32` |
| `UPSTASH_REDIS_REST_URL` | rate limiting | Upstash console |
| `UPSTASH_REDIS_REST_TOKEN` | rate limiting | Upstash console |

---

## Bootstrap Supabase (local)

```bash
# Appliquer les migrations
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -f "$f"
done

# Ou avec le CLI
supabase db push
```

---

## Lancer

```bash
npm run dev   # → http://localhost:3000
```

> **Mode dummy** : sans `NEXT_PUBLIC_SUPABASE_URL`, l'app démarre avec des mock data. Utile pour travailler sur l'UI sans backend.

---

## Vérifier la santé

```bash
# En local
curl http://localhost:3000/api/health

# En prod (version détaillée avec toutes les intégrations)
curl -H "Authorization: Bearer $HEALTH_SECRET" \
  https://app.proprely.fr/api/health
```

---

## Voir aussi
- [[Stack]] — Scripts npm et structure du repo
- [[Deployment]] — Variables pour la production
- [[Database]] — Détail des migrations Supabase
