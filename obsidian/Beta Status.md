# Beta Status

→ [[Home]] | Détail complet : [`docs/BETA_CHECKLIST.md`](../docs/BETA_CHECKLIST.md)

---

## État actuel : Bêta privée — 15 entreprises

Sprints 0+1+2+3+4 livrés (PR #36 + suivantes). Quelques tâches ops restantes avant ouverture.

---

## Métriques

| Métrique | Avant | Après |
|----------|-------|-------|
| Tests unitaires | 24 | **141** |
| Lint warnings | 27 | **0** |
| Migrations Supabase | 7 | **19** |
| Sentry coverage | 0 | client + server + edge |
| RBAC enforcement | UI seulement | UI + server actions + tests |
| Rate limiting | aucun | magic link + invitations |
| CSP header | non | oui |
| Health endpoint | non | `/api/health` |
| Audit trail | non | triggers PG sur 6 tables |
| Analytics | non | PostHog opt-in |

---

## Reste à faire avant ouverture (ops)

| # | Tâche | Responsable |
|---|-------|-------------|
| 1 | Appliquer les 3 nouvelles migrations en preview puis prod | DBA |
| 2 | Activer Realtime sur `missions` + `notifications` (Supabase Dashboard → Replication) | DBA |
| 3 | Préparer 2 comptes seed (companies A + B) pour test isolation tenant | DBA |
| 4 | Activer domaine Resend vérifié pour `RESEND_FROM` | Owner |
| 5 | Définir `HEALTH_SECRET` pour sondes uptime | DevOps |
| 6 | Exécuter les 5 scénarios de [[QA Scenarios]] sur la preview | Owner |
| 7 | Configurer Sentry alerts (Slack/email) | Owner |
| 8 | Confirmer PostHog event tracking (`signup_completed`) | Owner |
| 9 | Communiquer le périmètre bêta aux 15 sociétés | Owner |

---

## Features reportées (post-bêta, V1+)

- **H4** Tests E2E auth flow complet (bloqué : Supabase test project + mock mail)
- **V1.4** Refactor Docuseal templates partagés par service_type
- **V1.5** Audit responsive complet page-par-page
- **V1.6** Étape `hasInvitedMember` de l'onboarding checklist
- **V2.1** Real-time subscriptions Supabase (au-delà de missions + notifications)
- **V2.4** i18n complet
- **V2.5** Audit a11y WCAG AA
- **V2.6** App mobile native
- **V2.7-9** Intégrations comptabilité, marketplace SOPs, IA prix

---

## Tests Playwright cassés (pré-existants, hors scope)

| Test | Problème |
|------|---------|
| `e2e/ux-additions.spec.ts:10` Cmd+K | GlobalSearch timeout en dummy mode |
| `e2e/ux-additions.spec.ts:23` Cmd+K hint | Idem |
| `e2e/ux-additions.spec.ts:64` Statut dropdown | clients-sites redirige en dummy mode |

Ces 3 fails ne bloquent pas le merge — CI principal (Lint · Typecheck · Test · Build) passe en vert.

---

## Voir aussi
- [[QA Scenarios]] — 5 scénarios à valider avant ouverture
- [[Deployment]] — Procédure de mise en prod
- [[Branch Strategy]] — Phases terminées
