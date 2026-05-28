# Deployment

→ [[Home]] | Source complète : [`docs/RUNBOOK.md`](../docs/RUNBOOK.md) · [`docs/BETA_CHECKLIST.md`](../docs/BETA_CHECKLIST.md)

---

## Procédure de mise en prod

1. **Merge** la PR sur `main` (squash & merge recommandé)
2. **Set** les variables d'env Vercel (voir ci-dessous)
3. **Apply** les migrations Supabase → `supabase db push`
4. **Configure** Supabase Auth → Redirect URLs
5. **Vérifier** le domaine Resend (DKIM + SPF + DMARC)
6. **Configure** le webhook Docuseal (URL + secret)
7. **Tester** sur le déploiement production (voir smoke tests)
8. **Surveiller** Sentry 48h avant d'élargir

---

## Variables Vercel (Production)

| Variable | Comment l'obtenir |
|----------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Idem |
| `SUPABASE_SERVICE_ROLE_KEY` | Idem — **ne jamais exposer publiquement** |
| `NEXT_PUBLIC_APP_URL` | `https://app.proprely.fr` |
| `DOCUSEAL_API_KEY` | console.docuseal.com → API |
| `DOCUSEAL_WEBHOOK_SECRET` | Générer + coller côté Docuseal Dashboard |
| `RESEND_API_KEY` | resend.com/api-keys |
| `RESEND_FROM` | `Proprely <noreply@proprely.fr>` (domaine vérifié) |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `HEALTH_SECRET` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_SENTRY_DSN` | sentry.io → Settings → Client Keys |
| `SENTRY_DSN` | même valeur |
| `SENTRY_AUTH_TOKEN` | sentry.io → Auth Tokens (scope: `project:releases`) |
| `SENTRY_ORG` | slug org Sentry |
| `SENTRY_PROJECT` | slug projet Sentry |
| `NEXT_PUBLIC_POSTHOG_KEY` | posthog.com → Project settings |
| `UPSTASH_REDIS_REST_URL` | Upstash console |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash console |

---

## Supabase Auth → URL Configuration

- **Site URL** : `https://app.proprely.fr`
- **Redirect URLs** :
  - `https://app.proprely.fr/auth/callback`
  - `https://*-energypromag.vercel.app/auth/callback` (preview branches)

---

## Docuseal Webhook

- URL : `https://app.proprely.fr/api/docuseal/webhook`
- Event : `submission.completed`
- Secret : valeur de `DOCUSEAL_WEBHOOK_SECRET`

---

## Cron Jobs (Vercel)

Déclarés dans `vercel.json` — Vercel les enregistre au premier déploiement.

| Path | Schedule | Description |
|------|----------|-------------|
| `/api/cron/mission-alerts?mode=both` | `0 6 * * *` | Alertes missions (06h UTC) |
| `/api/cron/recurrences` | `0 4 * * *` | Récurrences (04h UTC) |

> Plan Hobby compatible (2 crons, 1×/jour). Late alerts en heures ouvrées nécessitent Vercel Pro.

**Tester manuellement :**
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://app.proprely.fr/api/cron/mission-alerts?mode=both
# attendu : 200 + JSON { remindersSent, alertsSent, durationMs }
```

---

## Smoke tests post-déploiement

```bash
# Health check
curl https://app.proprely.fr/api/health
# → 200 { status: 'ok' }

curl -H "Authorization: Bearer $HEALTH_SECRET" \
  https://app.proprely.fr/api/health
# → 200 + détail toutes intégrations à true

# Auth sans header
curl https://app.proprely.fr/api/cron/mission-alerts
# → 401
```

**Flux manuels à vérifier :**
- Créer un compte → recevoir magic link → atterrir sur dashboard
- Inviter un collègue → mail Proprely-branded → accepter l'invitation
- Créer client + agent + mission → vérifier Journal d'audit dans `/parametres`
- Envoyer un devis fictif → simuler signature → devis passe à "signé"

---

## Voir aussi
- [[Operations]] — Runbook incidents en production
- [[Database]] — Migrations à appliquer
- [[Beta Status]] — Checklist avant ouverture aux 15 sociétés
