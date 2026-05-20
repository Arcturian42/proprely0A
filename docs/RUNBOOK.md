# Proprely Admin — Runbook ops

Incident response + recovery playbooks. Garde ce fichier ouvert pendant les
incidents. Quand un user signale un problème, commencer par identifier
quelle intégration est touchée et appliquer le bon playbook.

## Architecture express

```
Browser ──▶ Vercel (Next.js 16) ──▶ Supabase (Postgres + Auth + RLS)
                │                       │
                ├──▶ Docuseal  (signature)
                ├──▶ Resend    (emails transactionnels)
                ├──▶ SIRENE    (recherche entreprises FR, anonyme)
                └──▶ Sentry    (error + perf monitoring)
```

Endpoint santé : **`GET /api/health`** retourne 200 quand toutes les
intégrations critiques (Supabase, Docuseal, Resend) sont configurées,
sinon 503. Plug une sonde uptime (Better Uptime / UptimeRobot) dessus.

## Variables d'env critiques (Vercel)

| Var | Service | Manquante = ? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | App refuse de servir en prod (assert) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Idem |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase (signup, invites) | Signup/invites HS |
| `NEXT_PUBLIC_APP_URL` | Magic-link redirect | Liens email pointent sur localhost |
| `DOCUSEAL_API_KEY` | Signature | Envoi devis impossible |
| `DOCUSEAL_WEBHOOK_SECRET` | Signature webhook | Signatures jamais notifiées (mais accept tout = vulnérable !) |
| `RESEND_API_KEY` | Email | Invitations fallback sur Supabase mail (basique) |
| `RESEND_FROM` | Email | Délivrabilité dégradée (sandbox) |
| `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_DSN` | Monitoring | Pas de trace en cas de crash |
| `CRON_SECRET` | Vercel Cron | Crons retournent 401 → rappels J-1, alertes late, récurrences ne s'exécutent pas |

## Playbooks

### 1. Supabase down / `503` global

**Symptômes** : Le `/api/health` retourne `supabase: false` OU les pages
affichent l'écran d'erreur global.

**Action** :
1. Vérifier https://status.supabase.com.
2. Si incident upstream → afficher une maintenance banner (TODO V2) et
   attendre. Les utilisateurs ne perdent rien (le store Zustand persiste
   les changements en cours en localStorage en dummy mode — mais en mode
   réel le store est cleared au logout).
3. Si rien côté Supabase :
   - Vérifier que les env vars Vercel sont bien populated.
   - Tenter de logger en service-role depuis Supabase Studio → si KO,
     régénérer la `service_role` key et la mettre à jour sur Vercel.

### 2. Webhook Docuseal foire / devis pas marqué "signé"

**Symptômes** : Un client a signé mais la quote reste en statut `envoye`.

**Action** :
1. Aller sur https://console.docuseal.com → Submissions → trouver la
   submission concernée → vérifier "completed".
2. Dans la console Sentry, filtrer sur `route=/api/docuseal/webhook`.
   - Si 401 "Invalid signature" → `DOCUSEAL_WEBHOOK_SECRET` côté Vercel
     ne matche pas le secret Docuseal. Régénérer côté Docuseal et update
     les deux côtés.
   - Si 500 → erreur Supabase, voir la stack.
3. Si urgence : flip manuellement le statut depuis Supabase Studio
   (`UPDATE quotes SET status='signe', signed_at=NOW() WHERE id=…`).
   **Ne JAMAIS** flip un quote sans confirmation visuelle de la signature
   côté Docuseal.

### 3. User n'a pas reçu le magic link / invitation

**Symptômes** : "Je clique sur Login, je rentre mon email, je ne reçois
rien".

**Action** :
1. Lui demander de vérifier les spams (le sandbox Resend `onboarding@resend.dev`
   atterrit souvent en spam).
2. Vérifier sur https://resend.com/emails → chercher l'adresse → status
   du dernier envoi. Si "bounced" ou "complained", domaine du user est
   bloqué.
3. Vérifier sur Supabase Studio → Authentication → Logs → chercher
   l'email. Si rien, c'est le rate-limiter app qui a bloqué (5 tentatives
   / 10 min). Attendre + retry.
4. En dernier recours : créer manuellement le user via Supabase Studio
   → Auth → Add user, puis l'inviter depuis l'app pour qu'il accède au
   bon profile.

### 4. SIRENE API timeout / pas de résultats sur "Nouvelle opportunité"

**Symptômes** : Sur le wizard prospect, autocomplete vide ou erreur.

**Action** :
- L'API `recherche-entreprises.api.gouv.fr` est anonyme et peut rate-
  limiter ~7 req/s. C'est OK pour 60 users mais surveillé en cas d'abus.
- Vérifier dans Sentry les `POST /api/sirene/search` 5xx.
- Pas de fallback aujourd'hui — TODO V2 : permettre saisie manuelle
  si l'API ne répond pas (l'UI a déjà un toggle "Manuel" — vérifier
  qu'il marche bien).

### 5. Un user désactivé peut quand même se connecter

**Symptômes** : Membre marqué `is_active: false` arrive sur le dashboard.

**Action** :
- Depuis le sprint pré-beta, `proxy.ts` charge `is_active` en même temps que
  `role`/`company_id`. Si `is_active = false` → `auth.signOut()` côté serveur
  + redirect `/login?error=account_disabled`. La page login affiche un
  message FR clair via le map `ERROR_MESSAGES`.
- Si malgré ça un user désactivé arrive sur le dashboard : vérifier que le
  cookie Supabase a bien été dropé (`sb-access-token` absent dans les
  cookies du navigateur). Si présent, vider manuellement et retester.
- Vérifier que la modification `profiles.is_active` est bien commitée en
  base — `revalidatePath('/parametres')` est appelé par `setMemberActive`,
  mais le middleware lit la valeur fraîche à chaque requête, donc la
  désactivation s'applique au prochain hit du middleware.

### 6. Vercel Cron tombe en 401

**Symptômes** : Dans Vercel Logs ou Sentry, requêtes `GET /api/cron/*`
renvoient 401 — les rappels J-1 et alertes mission late ne partent pas, et
les missions récurrentes ne se génèrent plus.

**Action** :
1. Vérifier que `CRON_SECRET` est set côté Vercel (Project Settings → Env Vars).
2. Vérifier que `vercel.json` à la racine contient bien les 3 entrées sous
   `crons` (mission-alerts × 2 + recurrences). Vercel passe automatiquement
   `Authorization: Bearer ${CRON_SECRET}` aux URLs listées là, **pas
   ailleurs**.
3. Tester manuellement :
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" \
     https://app.proprely.fr/api/cron/mission-alerts?mode=both
   ```
   → doit retourner 200 + JSON `{remindersSent, alertsSent, durationMs}`.
4. Si toujours 401 : `verifyBearer` short-circuite sur longueur différente.
   Vérifier qu'il n'y a pas d'espace en trop dans la valeur stockée sur
   Vercel.

## Backups & DR

- **Supabase** : Plan Pro requis pour les PITR auto. À confirmer côté
  billing — sinon export quotidien via `pg_dump` + storage S3 (TODO).
- **Recovery RTO/RPO** : actuellement non chiffré, viser RPO 24h / RTO
  4h une fois la beta lancée.

## Quotas externes connus

### Resend
- **Free** : 100/jour, 3 000/mois — insuffisant pour 60 users actifs
  envoyant invitations + devis envoyés + signatures. À surveiller depuis
  le dashboard Resend.
- **Pro** : passer au plan Pro avant 30 users actifs.

### Docuseal
- **Free** : ~20 templates/jour, ~100 submissions/mois.
- **Notre wrapper crée 1 template par devis envoyé** — quota épuisable
  vite. TODO V1.4 : templates partagés réutilisables.

### Supabase
- **Free** : 500 MB DB, 50k MAU, 5 GB bandwidth → suffisant pour la beta.
- Watch `pg_stat_database` si on dépasse 100k requêtes/jour.

### Vercel
- **Hobby** : 100 GB-hours/mois, 100k function invocations.
- **Pro** : 1 TB-hours, 1M invocations — viser ce plan dès la beta.

## Contacts d'urgence

- Resend support : support@resend.com
- Docuseal : support@docuseal.com
- Supabase : support@supabase.com (Pro+) ou Discord
- Vercel : support@vercel.com
