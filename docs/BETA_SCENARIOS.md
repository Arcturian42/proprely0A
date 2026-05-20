# Proprely — Scénarios QA pour bêta privée

Ce document liste les **5 scénarios métier de bout-en-bout** à valider
manuellement avant d'ouvrir la bêta aux premières sociétés. Chaque scénario
suit un parcours utilisateur réel et combine plusieurs modules — c'est ce
qu'on vérifie en QA finale, pas les tests unitaires.

Tous les scénarios partent d'un environnement Supabase préview seedé
(`pnpm seed` ou Supabase Studio) avec au moins une `companies` + un owner
+ un agent.

---

## Scénario 1 — Création de société (Onboarding complet)

**Objectif** : valider que l'onboarding 6 étapes ne bloque jamais un owner.

**Préconditions** :
- Email professionnel non utilisé sur la prod.

**Étapes** :
1. Visiter `/signup`, saisir prénom + nom + nom d'entreprise + email valide.
2. Cliquer "Créer mon entreprise" → toast confirmation, lien magic envoyé.
3. Ouvrir l'inbox → cliquer le lien `/auth/callback?code=…&next=/onboarding/2`.
4. Étape 2 (Équipe) : ajouter 1 invité avec rôle `sales` → "Inviter".
5. Étape 3 (Services) : cocher 2 services existants (ex. "Bureaux", "Vitrerie").
6. Étape 4 (Tarification) : remplir prix HT + temps moyen pour chaque service.
7. Étape 5 (Pricing settings) : taux horaire main-d'œuvre + marge cible.
8. Étape 6 (Confirmation) : "Terminer".

**Résultats attendus** :
- ✅ Workspace `companies` créé avec slug unique, profile `owner` lié.
- ✅ `onboarding_status` initialisé avec `step_1_completed_at` non-null.
- ✅ Email d'invitation envoyé via Resend (vérifier `RESEND_FROM`).
- ✅ `service_types`, `pricing_rules`, `company_pricing_settings` peuplés.
- ✅ Redirect final → `/dashboard` avec empty state "Bienvenue".
- ✅ Dans `audit_logs` : 1 insert sur `companies` + 1 sur `profiles`.

**Points de cassure historiques** :
- BUG-001 : table `onboarding_status` doit exister (migration appliquée).
- BUG-008 : `NEXT_PUBLIC_APP_URL` ne doit pas finir par `/`.
- BUG-002 : retomber sur `/login?error=missing_profile` ne doit pas crash.

---

## Scénario 2 — Premier devis signé (Pipeline → Won → Cockpit)

**Objectif** : flow CRM complet de la prospection à la mission planifiée.

**Préconditions** : sociétés de scénario 1 active, owner connecté.

**Étapes** :
1. `/commercial/pipeline` → "+ Nouvelle opportunité".
2. Étape 1 wizard : taper "ACME" → SIRENE autocomplete → choisir une entreprise.
3. Étape 2 : contact + email + téléphone + rôle.
4. Étape 3 : `next_action_type = devis_envoyer`, date demain.
5. Carte créée en colonne "Ouvert". Drag vers "Découverte".
6. Cliquer la carte → "Créer un devis".
7. QuoteFlow : Step 1 ajouter service "Bureaux", surface 150m², 2 agents x 4h.
8. Step 4 : vérifier marge ≥ 35% (warning rouge sinon).
9. Step 5 : prévisualiser PDF → "Créer le devis".
10. Bouton "Envoyer via Docuseal" → email signé envoyé au prospect.
11. Webhook Docuseal `signed` → quote.status = `signe`.
12. Drag carte vers "Gagné" → client + site + operational_item créés.
13. `/operations/cockpit` → mission en colonne "À organiser".

**Résultats attendus** :
- ✅ `quotes.quote_number` au format `DEV-2026-NNNN` (RPC atomique).
- ✅ PDF généré avec logo, line items, TVA, signature zone.
- ✅ `quotes.signed_at` non-null après webhook.
- ✅ Win flow : `clients`, `sites`, `operational_items` créés en cascade.
- ✅ Toast "🎉 Opportunité gagnée".

**Points de cassure** :
- `DOCUSEAL_WEBHOOK_SECRET` doit matcher (HMAC validé côté handler).
- `RESEND_API_KEY` valide pour l'envoi du PDF en pièce jointe.

---

## Scénario 3 — Mission en cycle complet (Cockpit → Daily → Validation)

**Objectif** : un manager + un agent simulent une journée de terrain avec
Realtime.

**Préconditions** : mission "À organiser" de scénario 2, 1 agent actif.

**Étapes** :
1. Owner sur `/operations/cockpit` → cliquer mission → OrganizationWizard.
2. Étape 1 : confirmer services. Étape 2 : contraintes site.
3. Étape 3 : ajouter machines + consommables. Étape 4 : choisir une
   proposition de planning (auto-générée par scheduling.ts).
4. Statut auto → `planifie`. Drag agent recommandé → assigné.
5. **Ouvrir un second onglet** comme agent (CompanySwitcher dev OU
   second compte). Aller sur `/agent/mon-agenda` → mission visible.
6. Agent tape "Démarrer" → statut `en_cours`.
7. **Vérifier côté owner (premier onglet)** : `/operations/missions-du-jour`
   se met à jour live (Realtime) sans rechargement.
8. Agent tape "Terminer" → statut `a_valider`.
9. Owner valide les heures réalisées dans le dialog.
10. `/rh/heures-paie` : entrée passe à `validee`, écart affiché en couleur.

**Résultats attendus** :
- ✅ DM-08 : transition `en_cours → a_valider` visible en <2s côté owner.
- ✅ HRS-02 : `time_entries.validated_hours` peuplé après validation.
- ✅ HRS-05 : si écart ≥ 20%, toast warning au moment de la validation.
- ✅ Audit log : 3 entries sur `missions` (statuts) + 1 sur `time_entries`.

**Points de cassure** :
- Realtime Supabase actif sur les tables `missions` + `notifications`.
- WebSocket sur `wss://*.supabase.co` autorisé par CSP.
- Si pas de Realtime → fallback polling 60s, manager doit refresh.

---

## Scénario 4 — Signaler un problème (Agent → Notification manager)

**Objectif** : valider l'inbox notifications + RLS par recipient.

**Préconditions** : mission en `en_cours`, agent connecté.

**Étapes** :
1. Agent sur `/agent/mes-missions` → mission en cours.
2. Aller sur `/operations/missions-du-jour` (ou équivalent agent).
3. Bouton "Signaler problème" → dialog s'ouvre.
4. Sélectionner catégorie "Accès refusé / clé manquante".
5. Description : "Le concierge est en congé, immeuble verrouillé."
6. Cliquer "Signaler".
7. **Côté owner** (second onglet) : cloche sidebar affiche badge "1".
8. Cliquer la cloche → notification "Problème signalé — ACME" en
   severity `critical`, body avec catégorie + description.
9. Cliquer la notification → redirect `/operations/missions-du-jour`.

**Résultats attendus** :
- ✅ Mission flippe à `probleme_signale`.
- ✅ `notifications` row créée avec `kind='mission_issue_reported'`,
  `severity='critical'`, `recipient_id` = chaque user avec
  `mission:write` (owner + admin + ops manager s'il y en a).
- ✅ Badge unread `+1` sur la cloche (Realtime).
- ✅ RLS : le sales ou autre agent ne voient PAS cette notification.

**Points de cassure** :
- Migration `20260520000002_notifications` appliquée.
- Realtime `postgres_changes` actif sur la table `notifications`.

---

## Scénario 5 — Tenant isolation (data leak check)

**Objectif** : prouver qu'une société A ne voit jamais les données de B.

**Préconditions** :
- Société A avec ≥ 3 clients, 5 missions, 1 agent.
- Société B avec ≥ 3 clients, 5 missions, 1 agent.
- Un owner pour chaque.

**Étapes** :
1. Login owner A → vérifier `/dashboard` montre ses KPI (compte précis).
2. Ouvrir DevTools → onglet Network → recharger `/dashboard`.
3. Inspecter la requête `loadCompanyData` (server action) : payload contient
   UNIQUEMENT les `company_id` de A.
4. Login owner B (autre navigateur ou incognito).
5. Vérifier KPI ≠ ceux de A.
6. Ouvrir DevTools → State Zustand (React DevTools) : 0 ligne avec
   `company_id` de A.

**Test SQL direct (Supabase Studio en mode owner A)** :
```sql
SELECT count(*) FROM missions WHERE company_id != current_company_id();
-- Expected: 0
```

**Résultats attendus** :
- ✅ SEC-01 : aucune ligne cross-tenant retournée.
- ✅ SEC-02 : RLS enforcée même via service_role accidentel (FORCE RLS).
- ✅ Le snapshot de A ne contient AUCUN id présent dans le snapshot de B.
- ✅ DevTools Console n'affiche aucun warning Supabase "cross-tenant".

**Test rôle-aware (Sprint 2)** :
- Login agent de A : `loadCompanyData` retourne :
  - `agents` avec `hourly_cost = null` partout (sauf soi-même via
    redact dans `loadAgentSnapshot`)
  - `missions` filtrées via `mission_agents.agent_id`
  - `time_entries` filtrées sur l'agent
  - `leads`, `opportunities`, `quotes`, `operational_items` = []
- Login sales de A : `agents` avec `hourly_cost = null`,
  `time_entries = []`, `hourly_labor_cost = null`.

---

## Checklist sortie de QA

Avant d'inviter les 15 sociétés bêta :

- [ ] Scénario 1 (Onboarding) : 100% green sur 2 comptes différents.
- [ ] Scénario 2 (Devis signé) : Docuseal webhook reçu en preview.
- [ ] Scénario 3 (Mission cycle) : Realtime visible en <2s sur split-screen.
- [ ] Scénario 4 (Issue notif) : badge cloche apparaît sans refresh.
- [ ] Scénario 5 (Tenant isolation) : 0 ligne cross-tenant.
- [ ] `/api/health` retourne 200 avec `tables_ok.notifications = true`.
- [ ] Sentry capture une erreur de test (`/sentry-example-page`).
- [ ] PostHog enregistre un event `signup_completed`.
- [ ] Audit logs visibles dans `/parametres?tab=audit` (owner only).
- [ ] CSP n'émet aucun warning console sur les pages bêta.

Si tous OK → la branche est ready-for-merge sur `main` puis ouverture aux
15 entreprises.
