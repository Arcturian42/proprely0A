# Operations & Incidents

→ [[Home]] | Runbook complet : [`docs/RUNBOOK.md`](../docs/RUNBOOK.md)

---

## Health Check

```bash
GET /api/health
```
- `200` → toutes les intégrations configurées
- `503` → une intégration critique manquante
- Avec `Authorization: Bearer $HEALTH_SECRET` → détail complet

**Brancher une sonde uptime** (Better Uptime / UptimeRobot) sur `/api/health`.

---

## Intégrations critiques

| Intégration | Impact si DOWN |
|-------------|----------------|
| Supabase | App refuse de servir en prod (assert runtime) |
| Supabase Auth | Login / signup HS |
| Docuseal | Envoi de devis impossible |
| Resend | Emails (magic links, invitations) HS |
| Sentry | Pas de monitoring erreurs (non bloquant) |

---

## Variables critiques

| Variable manquante | Symptôme |
|--------------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | App ne démarre pas en prod |
| `NEXT_PUBLIC_APP_URL` | Magic links pointent sur localhost |
| `SUPABASE_SERVICE_ROLE_KEY` | Signup / invitations HS |
| `DOCUSEAL_API_KEY` | Envoi devis impossible |
| `RESEND_API_KEY` | Emails HS |

---

## Playbooks

> Les playbooks détaillés (avec étapes de rollback) sont dans [`docs/RUNBOOK.md`](../docs/RUNBOOK.md).

### Utilisateur bloqué / profil désactivé
- Le proxy redirige `is_active=false` → `/login?error=access_denied`
- Réactiver via Supabase Studio → `profiles` → `is_active = true`

### Magic link expiré
- `/login` affiche les codes d'erreur `?error=expired` avec message FR
- Utilisateur peut demander un nouveau lien via "Tu n'as pas reçu l'email ?"

### Rate limiting déclenché
- In-memory : 5/10min magic link, 10/10min invitations
- Upstash Redis si `UPSTASH_REDIS_REST_URL` configuré
- Message FR affiché à l'utilisateur

### Webhook Docuseal échoue
- `/api/docuseal/webhook` valide la signature HMAC (en prod)
- Vérifier `DOCUSEAL_WEBHOOK_SECRET` = valeur dans Docuseal Dashboard

### Erreur 500 générique
- Sentry capture toutes les exceptions server-side
- Les `err.message` bruts ne fuient jamais vers le client (API quotes/actions)

---

## Voir aussi
- [[Deployment]] — Variables d'env et setup prod
- [[Database]] — Migrations et Real-time
