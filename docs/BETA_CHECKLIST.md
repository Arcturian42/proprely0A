# Proprely Admin — Checklist beta 15 entreprises

État au moment du commit `ceb98f7` sur `sprint/urgent-fixes` — branche prête
à merger une fois la PR review faite.

## ✅ Ce qui est terminé (code mergé en attente)

### Sprint 1 — URGENT (sécurité + correctness)
- **U1** Signature HMAC sur `/api/docuseal/webhook` (timingSafeEqual, env var
  `DOCUSEAL_WEBHOOK_SECRET`).
- **U2** `signUpCompany` rollback robuste : pre-flight email check, gestion
  duplicate, cleanup auth.users en best-effort.
- **U3** `acceptInvitation` verrouillée contre race condition (UPDATE
  conditionnel sur status='pending', rollback en cas d'échec profile insert).
- **U4** `listInvitations` gated owner/admin côté server action.
- **U5** Composant `<EmptyState>` partagé, intégré sur clients-sites, agents,
  cockpit, dashboard.
- **U7** Production safety : assert lazy au runtime, refus de servir sans
  Supabase configuré (skipped pendant `next build`).
- **U8** Loading state + anti-double-clic sur le bouton "Envoyer devis" dans
  `QuoteFlow`.

### Sprint 2 — HAVE TO (scale + santé)
- **H1** Sentry client/server/edge + `instrumentation.ts` + endpoint
  `/api/health` avec status 200/503 selon les intégrations configurées.
- **H2** Pagination dans `loadCompanyData` : missions 200, time_entries 90
  derniers jours, leads 500, quotes 200.
- **H3** `stripJoins()` avec allow-list explicite (plus de branche array
  agressive qui supprimait silencieusement les champs).
- **H5** Tests unitaires `requirePermission` (8 cas couvrant dummy mode,
  auth, role checks, désactivation, RBAC matrix).
- **H6** Header CSP complet (default-src self + allowlist Supabase / Sentry
  / Resend / Docuseal / SIRENE, frame-ancestors none).
- **H7** Rate limiter in-memory : 5/10min pour magic link, 10/10min pour
  invitations, 5/10min pour resend. 4 tests.
- **H8** Pages dashboard / missions-du-jour / planning migrées vers
  `useCompany*()` selectors (re-renders limités à la slice concernée).
- **H9** `AppSidebar.visibleSections` mémoïsé sur `role`.
- **H10** CI : job `npm audit --audit-level=high` (warn-only pour l'instant)
  + job `dependency-review` sur PRs.
- **H11** + **H12** : `docs/RUNBOOK.md` complet — incident playbooks,
  variables d'env critiques, quotas Resend/Docuseal/Supabase/Vercel.

### Sprint 3 — NICE TO HAVE
- **N1** 27 unused imports → 0 warnings.
- **N2** `aria-label` sur tous les boutons icon-only des pages settings,
  clients-sites, agents.
- **N4** Bloc "Tu n'as pas reçu l'email ?" sur `/login` avec 5 causes
  typiques.
- **N7** Audit grep : aucun `console.log` ne logue le clearToken.
- **N8** Warning console.warn en prod si `RESEND_FROM` est encore le
  sandbox `onboarding@resend.dev`.

### Sprint V1 (post 2 first users)
- **V1.1** Migration `20260517000007_audit_logs.sql` + triggers Postgres
  sur companies/profiles/missions/quotes/time_entries/invitations.
  Server action `listAuditLogs` + composant `<AuditLogPanel>` dans un
  nouvel onglet "Journal d'audit" de `/parametres`.
- **V1.2** Templates `quoteSignedEmail` + `missionAssignedEmail`. Câblage :
  - Webhook Docuseal → mail au commercial qui a créé le devis.
  - `assignAgentsToMission` → mail uniquement aux agents nouvellement
    assignés (pas de spam sur re-save).
- **V1.4** Note inline dans `docuseal.ts` documentant le quota templates et
  pointant vers la future optimisation (template_id partagé par service_type).
- **V1.6** `<OnboardingChecklist>` au dashboard : 4 étapes (premier client,
  premier agent, première mission, premier invité), masqué quand 4/4 fait.
- **V1.8** 10 tests sur les mutations critiques du store : `winOpportunity`,
  `signOpportunityContract`, `updateMissionStatus`, `deleteClient` cascade.

### Sprint V2 (long-terme amorcé)
- **V2.2** PostHog : wrapper `posthog-js`, composant `AnalyticsBootstrap`,
  events `signup_completed/failed`, `invitation_accepted/_failed`.

### Hygiène
- `.env.example` à jour avec **tous** les env vars : Supabase (3),
  `NEXT_PUBLIC_APP_URL`, Docuseal (2 dont webhook secret), Resend (2),
  Sentry (5), PostHog (2). 14 variables documentées.
- `docs/RUNBOOK.md` (playbooks ops) + `docs/BETA_CHECKLIST.md` (ce fichier).

## ⏳ Reste bloqué / nécessite action externe

Aucun code à écrire, juste des configurations à appliquer sur les services
externes avant d'ouvrir aux 60 users.

### Vercel — Project Settings → Environment Variables (Production)

| Var | Valeur attendue | Comment l'obtenir |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Dashboard Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé `anon` | Idem |
| `SUPABASE_SERVICE_ROLE_KEY` | clé `service_role` | Idem (ne JAMAIS exposer publiquement) |
| `NEXT_PUBLIC_APP_URL` | `https://app.proprely.fr` (ou ton domaine) | Toi |
| `DOCUSEAL_API_KEY` | clé API | console.docuseal.com → API |
| `DOCUSEAL_WEBHOOK_SECRET` | secret aléatoire | Générer un secret puis le coller côté Docuseal Dashboard → Webhooks → Secret |
| `RESEND_API_KEY` | clé `re_…` | resend.com/api-keys |
| `RESEND_FROM` | `Proprely <noreply@proprely.fr>` | **Domaine doit être vérifié** sur Resend |
| `NEXT_PUBLIC_SENTRY_DSN` | `https://xxx@sentry.io/yyy` | sentry.io → Settings → Client Keys |
| `SENTRY_DSN` | même valeur | Idem |
| `SENTRY_AUTH_TOKEN` | token | sentry.io → Settings → Auth Tokens (scope: `project:releases`) |
| `SENTRY_ORG` | slug org | Idem |
| `SENTRY_PROJECT` | slug projet | Idem |
| `NEXT_PUBLIC_POSTHOG_KEY` (optionnel) | `phc_…` | posthog.com → Project settings |

### Supabase — Auth → URL Configuration

- **Site URL** : `https://app.proprely.fr` (ou ton domaine final)
- **Redirect URLs** (whitelist) :
  - `https://app.proprely.fr/auth/callback`
  - `https://*-energypromag.vercel.app/auth/callback` (pour les preview branches)

### Resend — Domain verification

- Créer un domaine vérifié (DNS DKIM + SPF + DMARC).
- Mettre à jour `RESEND_FROM` côté Vercel.
- Tester l'envoi via `GET /api/dev/test-resend?to=ton@email.com` (auth requise).

### Docuseal — Webhook config

- Dashboard Docuseal → Webhooks → ajouter :
  - URL : `https://app.proprely.fr/api/docuseal/webhook`
  - Events : `submission.completed`
  - Secret : la même valeur que `DOCUSEAL_WEBHOOK_SECRET` côté Vercel.

### Supabase — Migrations à appliquer en prod

```bash
# Soit avec le CLI :
supabase db push

# Soit en pur SQL :
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -f "$f"
done
```

11 migrations idempotentes — safe à rejouer si déjà appliquées.

### Vercel — Branch protection

- GitHub → Settings → Branches → Add rule pour `main` :
  - Require PR before merging
  - Require status checks to pass (CI · Playwright · Supabase Preview)
  - Disallow force pushes

## 🟢 Sprint audit (post-roadmap review) — corrections P0/P1

Suite à l'audit QA/CTO du 2026-05-19, les éléments suivants ont été corrigés
avant d'ouvrir aux bêta-testeurs :

- **A1** API `/api/quotes/send` : suppression de la fuite `err.message` dans
  les réponses 500. Détail capturé via `Sentry.captureException` côté
  serveur, message générique côté client.
- **A2** TVA dynamique sur le devis PDF : libellé `TVA (X%)` calculé depuis
  `quote.costs.vat_rate` au lieu du hardcoded 20 %. `pricing-engine.ts`
  accepte un `vatRate` optionnel pour les sociétés non-FR (LU 17 %, export 0 %).
- **A3** Schémas Zod par entité (`src/lib/schemas/entities.ts`) pour
  agents/clients/sites/leads/opportunities/missions/time_entries/sops/
  service_types/operational_items/quotes. Branchés dans `upsert()` —
  validation structurelle avant d'atteindre Supabase, 23 tests unitaires.
- **A4** Soft delete sur clients/sites/agents (migration
  `20260519000000_soft_delete.sql`). `remove()` archive ces 3 entités
  (`archived_at = NOW()`) au lieu de DELETE. `loadCompanyData()` filtre
  les rows archivées via `.is('archived_at', null)`.
- **A5** Playwright `auth-forms.spec.ts` : 6 tests semi-réels (validation
  HTML5, server actions appelées, erreurs surfaceées) sans Supabase
  preview project. Pour le flow auth complet, H4 reste reporté.

## 🟡 Items reportés (out of scope beta, V1+ après onboarding)

Ces items n'ont pas été codés mais sont documentés dans le plan pour plus tard :

- **H4** Tests E2E auth flow complet (signup → magic link mock → dashboard).
  Bloqué sur : besoin d'un Supabase test project + mock du mail. (Versions
  semi-réelles en place — voir A5.)
- **V1.3** idem H4.
- **V1.4** (suite) Refactor Docuseal en templates partagés par service_type.
  Note inline laissée dans le code.
- **V1.5** Audit responsive complet de chaque page. Le layout mobile global
  fonctionne (sidebar + hamburger + overlay), mais polish page-par-page non
  fait.
- **V1.6** (suite) Étape "hasInvitedMember" du checklist : nécessite une
  server action `countInvitedMembers`. Pour l'instant la step reste toujours
  affichée comme à faire.
- **V1.7** Améliorations UX cockpit/planning (vague — attendre retours
  utilisateurs).
- **V2.1** Real-time Supabase subscriptions.
- **V2.3** Cache Vercel `revalidateTag` plus poussé.
- **V2.4** i18n (full FR pour beta).
- **V2.5** Audit a11y complet WCAG AA.
- **V2.6** App mobile native.
- **V2.7-9** Intégrations comptabilité, marketplace SOPs, IA prix.

## 🚀 Procédure de mise en prod

1. **Merge** la PR `sprint/urgent-fixes` sur `main` via GitHub (squash &
   merge recommandé).
2. **Set** tous les env vars Vercel ci-dessus (Production scope).
3. **Apply** les migrations Supabase en prod (`supabase db push`).
4. **Configure** Supabase Auth Redirect URLs.
5. **Vérifier** Resend domain.
6. **Configure** Docuseal webhook URL + secret.
7. **Tester** sur le déploiement production :
   - `GET https://app.proprely.fr/api/health` → 200 avec toutes les
     intégrations à `true`.
   - Créer un compte test → recevoir magic link → atterrir sur dashboard.
   - Inviter un collègue → il reçoit un mail Proprely-branded → accepte.
   - Créer un client + un agent + une mission → vérifier `/parametres →
     Journal d'audit` que tout est tracé.
   - Envoyer un devis fictif → recevoir l'email Docuseal côté client →
     simuler la signature → vérifier que le devis passe à "signé".
8. **Inviter** les 2 premiers users beta.
9. **Surveiller** Sentry pendant 48h avant d'ouvrir aux 13 autres.

## ✅ Sprint QA — Phase 1 + 2 (rapport QA 20 mai 2026)

### Phase 1 — Bloquant bêta privée
- **P1.2** Validation HTML5 française via `useFrenchValidation` hook
  (`src/lib/forms/use-french-validation.ts`) sur `/login` et `/signup`.
  Tooltip natif affiche désormais "Adresse email est requis." au lieu de
  "Please fill out this field.".
- **P1.3** Page dédiée `/signup/confirmation` après création de compte +
  Server Action `resendSignupLink` pour relancer un magic link.
- **P1.4** `recordingDuration` dans QuoteFlow capturé via `useRef`
  (`recordingStartRef`), plus de valeur 0 dans le toast/notes.
- **P1.5** `SUPPORT_EMAIL` constant exposé dans : footer public, FAQ login,
  AppSidebar dropdown (lien "Aide & support").
- **P1.6** `/api/health` bi-modal : `{status:'ok'}` public, version
  détaillée derrière `Authorization: Bearer ${HEALTH_SECRET}` avec
  `tables_ok.onboarding_status` (canary BUG-BLOQUANT-01).
- **P1.7** `/login` parse `?error=` (missing-code, server_error, expired,
  access_denied, invalid_request) et affiche un message FR dédié.
- **P1.8** Server Actions onboarding/invitations + auth/callback : remplace
  `error.message` brut par `toUserMessage(err, fallback)`.
- **P1.9** Webhook DocuSeal refuse les requêtes sans signature en prod
  (`VERCEL_ENV === 'production'`) au lieu de fail-open.
- **P1.10** Sentry — env vars à configurer côté Vercel (cf. RUNBOOK).

### Phase 2 — Critique bêta fermée → ouverte
- **P2.1** CGU et Politique de confidentialité réécrites en version 1.0
  RGPD-compliant (DPO, base légale, sous-traitants, durées de conservation,
  cookies, recours CNIL).
- **P2.3** `total_cost` dans `updateMissionStatus` calcule depuis
  `te.hourly_cost ?? companySettings.hourly_labor_cost ?? 0` (BUG-MAJ-05),
  avec hydratation `hourly_labor_cost` depuis `company_pricing_settings`.
- **P2.4** `quote_number` persistant via migration
  `20260520000000_quote_number_sequence.sql` + RPC `generate_quote_number()`
  + Server Action `generateQuoteNumber`. Format `DEV-2026-0001` atomique
  par (company, year).
- **P2.5** Script `scripts/post-deploy-check.mjs` — smoke /api/health avec
  HEALTH_SECRET pour gate CI/CD.

## ✅ Sprint QA — Hotfixes post-PR

- **Proxy gate is_active** : `src/proxy.ts` redirige vers
  `/login?error=access_denied` les profils `is_active=false` (correctif
  RUNBOOK section 5, faille documentée mais non corrigée).
- **`vercel.json`** créé avec 2 CRON jobs daily (recurrences à 4h UTC,
  mission-alerts à 6h UTC). Compatible plan Hobby (1 exécution/jour max).
  Late alerts business hours nécessitent Vercel Pro.
- **`.env.example`** complété : `HEALTH_SECRET`, `CRON_SECRET`,
  `UPSTASH_REDIS_REST_URL/TOKEN`, flag `CSP_STRICT`.
- **`generateQuoteNumber`** ajoute `requirePermission('opportunity:write')`
  en plus de la RLS RPC (défense en profondeur — empêche un agent
  authentifié de brûler des numéros).

## ❌ Faux positifs du rapport QA (vérifiés)

| Item rapport | Réalité | Preuve |
|---|---|---|
| BUG-CRIT-01 `deleteQuote` absent | Exposé dans le store | `src/lib/store.ts:682-685` |
| BUG-MAJ-07 `OWNER_SECRET` | N'existe pas | `grep -r OWNER_SECRET src/` → 0 |
| `lang="fr"` manquant | Déjà présent | `src/app/layout.tsx:58` |
| BUG-MAJ-04 404 absente | Implémentée | `src/app/not-found.tsx` |
| BUG-MIN-06 CSP absent | Configurée | `next.config.ts:33-48` (durcie Phase 3) |

## 🟡 Tests Playwright cassés pré-existants (hors scope de cette PR)

Ces 4 tests étaient déjà rouges sur `main` avant l'audit QA — non causés
par les changements de cette PR. À traiter dans une PR séparée :

| Test | Problème | Action recommandée |
|---|---|---|
| `e2e/settings.spec.ts:30` "Rentabilité is hidden from sidebar" | Obsolète : `Rentabilité client` est dans `AppSidebar.tsx:81` (feature activée) | Supprimer ou inverser l'assertion |
| `e2e/ux-additions.spec.ts:10` Cmd+K opens dialog | `GlobalSearch.tsx` existe mais le test timeout en dummy mode | Tester en mode authentifié seed Supabase |
| `e2e/ux-additions.spec.ts:23` Cmd+K hint | Idem | Idem |
| `e2e/ux-additions.spec.ts:64` Statut dropdown | `clients-sites` redirect en dummy mode (auth required) | Idem |

CI principal (`Lint · Typecheck · Test · Build`) passe en vert sur cette PR
— ces 4 fails Playwright ne sont pas un blocker merge.

## 📊 Métriques de référence (post-Sprint 1+2+3+V1+V2)

| Métrique | Avant | Après |
|---|---|---|
| Tests unitaires | 24 | **141** (+23 schémas Zod entités) |
| Lint warnings | 27 | **0** |
| Migrations Supabase | 7 | **19** (+ soft delete + audit + onboarding + pricing) |
| Sentry coverage | 0 | client + server + edge + request errors |
| Empty states | dashboard | dashboard + clients + agents + cockpit + onboarding |
| RBAC enforcement | UI only | UI + server actions + tests |
| Rate limiting | aucun | magic link + invitations |
| CSP header | non | oui (default-src strict) |
| Health endpoint | non | `/api/health` |
| Audit trail | non | triggers PG sur 6 tables |
| Analytics produit | non | PostHog opt-in |
| Runbook ops | non | `docs/RUNBOOK.md` complet |
