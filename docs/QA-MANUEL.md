# Manuel QA Proprely

> Document de test manuel exhaustif. Utiliser cette checklist avant chaque release ou quand on onboarde un nouveau pilote.
> Format : cases à cocher. Chaque cas note l'**action**, le **résultat attendu**, et les **cas d'erreur**.

**Stack** : Next.js 16.2.6 · Supabase SSR · Vitest + Playwright · Sentry + PostHog
**Environnements** : dev local (dummy mode) · preview Vercel · prod Vercel

---

## 0. Comptes de test

| Rôle | Email | Password / Login |
|---|---|---|
| Owner | `owner@proprely.fr` | Magic-link |
| Admin | `admin@proprely.fr` | Magic-link |
| Sales | `sales@proprely.fr` | Magic-link |
| Agent | `agent@proprely.fr` | Magic-link |

> Pour provisionner : `scripts/seed-test-auth-users.ts` + `supabase/seed.sql` (voir `supabase/SEED.md`).

---

## 1. Auth & accès

### 1.1 Page `/login`

- [ ] La page rend sans erreur console
- [ ] Le champ email est focus-accessible au clavier
- [ ] CTA visible : « Recevoir mon lien de connexion »
- [ ] Lien « Pas encore de compte ? Créer mon entreprise » → `/signup`
- [ ] Submit avec email invalide → toast d'erreur français
- [ ] Submit avec email valide → message « Lien envoyé. Consulte ta boîte mail. »
- [ ] Rate-limit (5/10 min) déclenche un toast « Trop de tentatives »

### 1.2 Page `/signup`

- [ ] Champs obligatoires marqués avec astérisque rouge
- [ ] Mention « * Champs obligatoires » visible
- [ ] Submit complet → message succès + indication « Consulte ta boîte mail (et indésirables) »
- [ ] Email déjà inscrit → erreur claire en français
- [ ] CTA « Sparkles · Créer mon entreprise »

### 1.3 Magic-link callback

- [ ] Cliquer le lien email → atterrit sur `/auth/callback?code=…`
- [ ] **Si owner avec onboarding incomplet** → redirige sur `/onboarding/{next}`
- [ ] **Si owner avec onboarding terminé** → redirige sur `/dashboard`
- [ ] **Si agent** → redirige sur `/agent/mon-agenda`
- [ ] **Si admin / sales** → redirige sur `/dashboard`
- [ ] Lien expiré → message d'erreur clair, retour à `/login`

### 1.4 Sign-out

- [ ] Bouton « Se déconnecter » dans le header (et dans onboarding layout)
- [ ] Click → retour à `/login`
- [ ] Le store Zustand est purgé
- [ ] L'utilisateur ne peut plus accéder à `/dashboard` (redirect login)

---

## 2. Onboarding (owner uniquement)

> Strict mode : tant que `onboarding_status.completed_at` est null, l'owner est forcé sur `/onboarding/{step}`. Les autres rôles n'y ont jamais accès.

### 2.1 Étape 1 — Signup

Validé par 1.2 ci-dessus.

### 2.2 Étape 2 — Inviter l'équipe (`/onboarding/2`)

- [ ] Affiche 1 ligne InviteRow vide par défaut
- [ ] Champs : prénom, nom, email (obligatoire), rôle (admin/sales/agent)
- [ ] Bouton « Ajouter un collaborateur » → ajoute une ligne (max 5)
- [ ] Bouton 🗑 sur chaque ligne supprime (sauf la dernière)
- [ ] Submit avec 0 email → toast erreur « Ajoute au moins un email »
- [ ] Submit valide → emails envoyés via Resend, étape marquée done, navigation auto vers `/onboarding/3`
- [ ] Bouton « Passer cette étape » → étape skipped, navigation vers `/onboarding/3`
- [ ] Recharger `/onboarding/2` après skip → redirect `/onboarding/3` (strict mode)

### 2.3 Étape 3 — Prestations (`/onboarding/3`)

- [ ] 11 prestations par défaut visibles, toutes cochées
- [ ] Décocher tout puis cliquer Continuer → erreur « Sélectionne au moins une prestation »
- [ ] Bouton « Ajouter une prestation » → champ nom + description custom
- [ ] Submit → service_types DB créés (vérifier `/parametres > Types de services`)
- [ ] Skip → step 3 + step 4 marqués skipped automatiquement, navigation vers `/onboarding/5`

### 2.4 Étape 4 — Tarification par prestation (`/onboarding/4`)

- [ ] Une carte expandable par prestation cochée à l'étape 3
- [ ] Champs : unité de calcul, prix HT, temps moyen, agents recommandés, consommables, marge, TVA, récurrence
- [ ] Tous facultatifs — submit avec tout vide doit passer
- [ ] Submit → pricing_rules DB créées (vérifier `/parametres > Tarification`)
- [ ] Skip disponible

### 2.5 Étape 5 — Paramètres généraux (`/onboarding/5`)

- [ ] Champs : taux horaire, marge cible %, TVA % (presets 20 / 10 / 5.5 / 0)
- [ ] Selects : politique consommables, déplacement, matériel, récurrence
- [ ] Section avancée (collapsible) : seuil repas, montant repas, location machine/jour
- [ ] Submit → company_pricing_settings upsertée, navigation `/onboarding/6`

### 2.6 Étape 6 — Confirmation (`/onboarding/6`)

- [ ] Animation Sparkles + emoji
- [ ] 3 CTAs : Créer un prospect / Ajouter un client / Planifier une mission
- [ ] Bouton primary « Accéder au dashboard »
- [ ] Click → `completeOnboarding()` server action, `completed_at` set, redirect `/dashboard`

### 2.7 Vérifications strict mode

- [ ] Aller sur `/onboarding/4` avant d'avoir fait l'étape 3 → redirect vers `/onboarding/<expected>`
- [ ] Revenir sur `/onboarding/3` après l'avoir validée → redirect vers l'étape courante
- [ ] Une fois `completed_at` set → `/onboarding/*` redirige vers `/dashboard`

---

## 3. Parcours par profil

### 3.1 Owner

#### Sidebar visible
- [x] Tableau de bord
- [x] Commercial : Pipeline · Clients & Sites
- [x] Opérations : Cockpit · Missions du jour · Planning · SOP
- [x] RH : Agents · Heures & Paie
- [x] Pilotage rentabilité : Rentabilité client · Analyse des heures
- [x] Paramètres

#### Accès `/parametres` (owner only)
- [ ] Onglet **Mon entreprise** : nom, email, phone, address, SIRET, sauvegarde
- [ ] Onglet **Équipe** : InvitationsPanel + MembersPanel
- [ ] Onglet **Types de services** : CRUD service_types
- [ ] Onglet **Tarification** : PricingSettingsPanel + lien pricing rules
- [ ] Onglet **Simulateur** : PriceCalculatorPanel avec preview live
- [ ] Onglet **Récurrences** : liste + création + désactivation
- [ ] Onglet **Journal d'audit** : audit_logs filterables
- [ ] Onglet **Notifications** : toggles (préparation V2)

#### Permissions owner only
- [ ] Peut modifier nom + SIRET de l'entreprise
- [ ] Peut promouvoir un admin (changement de rôle)
- [ ] Peut désactiver tous les autres profils
- [ ] Peut voir audit logs
- [ ] Peut accéder à `/onboarding/*` (si pas terminé)

### 3.2 Admin

#### Sidebar
- [x] Tout sauf `/parametres` Mon entreprise (read-only)
- [x] Tout sauf `/onboarding/*` (jamais accessible)

#### Permissions
- [ ] Peut créer / modifier / supprimer clients, sites, agents, missions
- [ ] Peut envoyer invitations (admin / sales / agent)
- [ ] **Ne peut pas** modifier nom/SIRET de l'entreprise (UI read-only)
- [ ] **Ne peut pas** changer son propre rôle ni celui de l'owner
- [ ] Peut accéder à audit log
- [ ] Si tente `/onboarding/2` directement → redirect `/dashboard`

### 3.3 Sales

#### Sidebar visible
- [x] Tableau de bord
- [x] Commercial : Pipeline · Clients & Sites
- [x] Opérations (Cockpit, Missions, Planning, SOP en lecture seule)
- [x] Rentabilité client (lecture)

#### Sidebar masquée
- [x] RH : Agents · Heures & Paie
- [x] Pilotage rentabilité : Analyse des heures
- [x] Paramètres

#### Permissions
- [ ] Peut créer / modifier opportunities, clients, sites
- [ ] Peut générer / envoyer devis (DocuSeal)
- [ ] **Ne peut pas** créer / modifier missions, agents, heures
- [ ] Si tente `/rh/agents` directement → redirect `/dashboard`
- [ ] Pas de bouton « Inviter un collaborateur »

### 3.4 Agent

#### Sidebar (mode agent only)
- [x] Mon agenda
- [x] Mes missions
- [x] Annuaire

#### Permissions
- [ ] Voit uniquement ses missions assignées (RLS filter)
- [ ] Peut marquer une mission en cours / terminée
- [ ] Peut signaler un problème (passe en `probleme_signale`)
- [ ] Peut valider ses heures (open dialog + saisie heures réelles)
- [ ] **Ne peut pas** voir le pipeline commercial
- [ ] **Ne peut pas** voir d'autres agents
- [ ] **Ne peut pas** voir les coûts main d'œuvre
- [ ] Si tente `/dashboard` directement → redirect `/agent/mon-agenda`

---

## 4. CRUD par entité

### 4.1 Clients & Sites (`/commercial/clients-sites`)

#### Clients
- [ ] **Create** : modal « Nouveau client » + champs name (req), contact, email, phone, billing_address, city, type, notes
- [ ] **Read** : liste paginée (20/page), search par nom/ville/contact/email
- [ ] **Filter** : Type (auto-populé), Statut (actif/inactif/prospect)
- [ ] **Update** : icône ✏️ → modal pré-rempli → save
- [ ] **Delete** : icône 🗑 → ConfirmDialog → suppression
- [ ] **Import CSV** : bouton ouvre `<CsvImportDialog>` avec colonnes attendues (nom req)

#### Sites
- [ ] **Create** : modal « Nouveau site » + champs name (req), client (req), address, city, surface, accès, fréquence
- [ ] **Read** : table paginée 20/page
- [ ] **Update** : icône ✏️
- [ ] **Delete** : icône 🗑 → ConfirmDialog

### 4.2 Agents (`/rh/agents`)

- [ ] **Create** : modal complet (prénom, nom, email, phone, zone, contrat, coût horaire, dispo hebdo, skills)
- [ ] **Read** : 12 cartes/page, search nom/email, filtres status / expertise / contrat
- [ ] **Update** : click sur carte → AgentProfilePanel ouvre
- [ ] **Delete** : ConfirmDialog → si agent affecté à mission active → toast d'erreur, blocage
- [ ] **Import CSV** : bouton « Importer CSV » avec colonnes prénom req / nom req / email req
- [ ] Vérifier qu'un nouvel agent reçoit bien email d'invitation
- [ ] La carte affiche : statut, taux charge, fatigue, compétences

### 4.3 Missions

#### Création
- [ ] Via `/operations/planning` → bouton « Nouvelle mission »
- [ ] Champs : site, date, heure début, durée, agents (multi), notes
- [ ] Conflit planning : agent déjà sur mission qui chevauche → **toast d'erreur server-side** « X est déjà sur une mission le YYYY-MM-DD de HH:MM à HH:MM »
- [ ] Création réussie → mission visible dans `/operations/missions-du-jour` si scheduled_date = aujourd'hui

#### Mise à jour statut (`/operations/missions-du-jour`)
- [ ] `prevue` → bouton « Démarrer » → `en_cours`
- [ ] `en_cours` → bouton « Terminer » → `a_valider`
- [ ] `en_cours` → bouton rouge « Signaler problème » → `probleme_signale` (carte rouge)
- [ ] `a_valider` → bouton « Valider » → dialog confirmation heures → `terminee`
- [ ] `terminee` → affichage « Mission validée ✅ »

#### Récurrence (`/parametres > Récurrences`)
- [ ] Création récurrence : site, fréquence, jour, durée, dates
- [ ] 4 missions enfants créées immédiatement
- [ ] Désactivation : ConfirmDialog → `is_active = false`, missions existantes préservées

### 4.4 Pipeline commercial (`/commercial/pipeline`)

#### Opportunities
- [ ] **Create manuel** : bouton « Nouvelle opportunité » → wizard 3 étapes (entreprise / contact / détails)
- [ ] **Create prospect** : bouton « Trouver de nouveaux prospects » → ProspectingFlow 5 étapes wizard → API SIRENE → swipe deck
- [ ] **Kanban DnD** : drag une carte d'une stage à une autre → update DB
- [ ] **Detail panel** : click sur carte → CardDetailPanel s'ouvre à droite
- [ ] **Win** : bouton « Gagné » → stage `gagne` → conversion en client + sites
- [ ] **Loss** : bouton « Perdu » → stage `perdu`
- [ ] **Delete** : ConfirmDialog

#### Stages
- [x] ouvert → decouverte → proposition → negociation → gagne / perdu
- [ ] Vérifier qu'une opportunité signée crée bien : 1 client + 1 site + 1 quote signé

### 4.5 Devis (depuis CardDetailPanel d'une opportunity)

- [ ] **Step 0 — Liste** : devis existants pour cette opportunity
- [ ] **Step 1 — Services** : pills de 7 catégories, ajout multiple, params par service (surface, complexité, fréquence)
- [ ] **Step 2 — Notes** : textarea + bouton « Note vocale » (simulation)
- [ ] **Step 3 — Médias** : drag-drop photos/vidéos (noms seulement en mock)
- [ ] **Step 4 — Calcul IA** :
  - Animation Sparkles pulse pendant 2s
  - Par service : breakdown (main d'œuvre, machines, consommables, transport, prix HT, marge)
  - **Badge « Tes règles »** (indigo) si pricing_rule configurée
  - **Badge « Standard »** (gris) sinon
  - Total combiné si plusieurs services
  - Lien indigo « Configure tes règles dans Paramètres > Simulateur »
- [ ] **Step 5 — Preview** : PDF preview avec header company, client, line items, totals
- [ ] Bouton « Envoyer via DocuSeal » → POST /api/quotes/send → submission DocuSeal créée
- [ ] Bouton « Régénérer » → reset à Step 1
- [ ] Bouton « Supprimer » → ConfirmDialog

### 4.6 Heures & Paie (`/rh/heures-paie`)

- [ ] Table avec date, agent, mission, heures prévues / validées, statut
- [ ] Filtres date range, status, agent
- [ ] **Export CSV** : bouton télécharge `heures-paie-YYYY-MM.csv`
- [ ] CSV contient : date, mission_id, agent, heures, taux horaire, coût total
- [ ] Pas de fiche de paie (CSV uniquement)

### 4.7 Service types (`/parametres > Types de services`)

- [ ] **Create** : nom, durée estimée, prix indicatif
- [ ] **Update** : édition inline ou modal
- [ ] **Delete** : ConfirmDialog → `is_active = false` (soft delete)

### 4.8 Pricing rules (`/parametres > Tarification`)

- [ ] Form `company_pricing_settings` complet : taux horaire, marge, TVA, policies, advanced
- [ ] Section avancée collapsible : repas + machine rental
- [ ] Bouton Sauvegarder → toast succès

### 4.9 Récurrences (`/parametres > Récurrences`)

- [ ] Liste : site, fréquence, jour, heure, durée, fenêtre, last_generated, status
- [ ] Bouton « Nouvelle récurrence » → dialog avec : site, durée, heure début, fréquence, weekday/day_of_month, dates
- [ ] Submit → 4 missions enfants créées immédiatement, dates listées
- [ ] Bouton 🗑 sur récurrence active → ConfirmDialog « Désactiver » (missions existantes restent)

### 4.10 Audit log (`/parametres > Journal d'audit`)

- [ ] Owner only voit l'onglet
- [ ] Liste paginée des opérations (INSERT/UPDATE/DELETE) sur companies, profiles, missions, quotes, time_entries, invitations
- [ ] Filtre par entity_type, action, actor
- [ ] Colonnes : timestamp, actor, action, entity, diff (before/after JSONB)

---

## 5. Flows critiques bout-en-bout

### 5.1 Signup → onboarding → premier devis

1. Aller sur `/signup`
2. Remplir le form, soumettre
3. Cliquer sur magic-link reçu par email
4. **Vérifier** : redirect sur `/onboarding/2`
5. Inviter 1 admin + 1 agent → étape 3
6. Cocher 3 prestations → étape 4
7. Configurer 1 prix pour la 1ère prestation → étape 5
8. Remplir paramètres (taux horaire 25€, marge 35%) → étape 6
9. Click « Accéder au dashboard » → redirect `/dashboard`
10. **Vérifier** : OnboardingChecklist `hasInvitedMember = true`
11. Aller sur `/commercial/pipeline` → créer nouvelle opportunité (manuel)
12. Depuis CardDetailPanel → créer devis → Step 1 services → 4 calcul
13. **Vérifier** : badge « Tes règles » (indigo) sur la prestation configurée
14. **Vérifier** : badge « Standard » sur les autres
15. Envoyer via DocuSeal → email simulé envoyé au signataire

### 5.2 Invitation → acceptation → premier login (admin)

1. Owner sur `/parametres > Équipe` → invite « admin@test.fr » role admin
2. **Vérifier** : email reçu avec lien `/accept-invitation/{token}`
3. Cliquer le lien → page acceptation
4. Saisir prénom + nom → submit
5. **Vérifier** : redirect `/dashboard` (pas `/onboarding/*`)
6. **Vérifier** : sidebar ne contient PAS le lien Paramètres > Mon entreprise (read-only)
7. **Vérifier** : peut créer client, créer mission, mais ne peut pas modifier le SIRET company

### 5.3 Lead SIRENE → opportunity → quote → signature

1. Pipeline → bouton « Trouver de nouveaux prospects »
2. Wizard 5 étapes : catégorie bureaux / taille 10-50 / surface 100-500m² / Paris postcode 75008 / qualité « Société récente »
3. « Lancer la recherche IA » → SIRENE API call
4. Swipe deck : swipe à droite sur 2 prospects, swipe à gauche sur 2 autres
5. **Vérifier** : 2 opportunities créées dans le kanban en stage `ouvert`
6. Click sur une opportunity → CardDetailPanel
7. Créer devis (4 steps) → envoyer DocuSeal
8. **Vérifier dans Sentry** : pas d'erreur
9. Webhook DocuSeal `submission.completed` (test via dashboard DocuSeal) → quote.status passe à `signe`
10. **Vérifier** : email « Devis signé » envoyé via Resend

### 5.4 Mission → heures → CSV paie

1. Owner crée une mission demain 9h-13h avec agent Sophie
2. **Vérifier** : badge « Sophie Martin » sur la carte mission
3. Agent Sophie se connecte → `/agent/mon-agenda` → voit la mission
4. Le jour J : Sophie click « Démarrer » → status `en_cours`
5. Sophie click « Terminer » → status `a_valider`
6. Admin se connecte → `/operations/missions-du-jour` → click « Valider » → dialog → saisir 3.5h → submit
7. **Vérifier** : mission status `terminee`, time_entries DB créées
8. Owner → `/rh/heures-paie` → date range cette semaine
9. **Vérifier** : ligne Sophie · mission #X · 3.5h · taux 18€/h · coût 63€
10. Bouton « Exporter CSV » → fichier téléchargé, contenu cohérent

---

## 6. Intégrations

### 6.1 DocuSeal (signature électronique)

- [ ] Webhook configuré : `https://<vercel-prod>/api/docuseal/webhook`
- [ ] Secret HMAC dans env `DOCUSEAL_WEBHOOK_SECRET`
- [ ] Test : envoi d'un devis → submission visible dans dashboard DocuSeal
- [ ] Signature côté client → webhook reçu → quote.status passe à `signe`
- [ ] Email confirmation envoyé au vendeur via Resend
- [ ] Sans signature, status reste `envoye`

### 6.2 Resend (emails transactionnels)

- [ ] Domaine vérifié (DNS SPF + DKIM) sur Resend dashboard
- [ ] Test invitation : owner invite quelqu'un → email reçu avec template invitationEmail
- [ ] Test mission assignée : agent assigné → email reçu
- [ ] Test rappel mission D-1 : cron `mission-alerts?mode=reminders` → email reçu par l'agent
- [ ] Test alerte mission en retard : cron `mission-alerts?mode=late` → email reçu par owner
- [ ] Test dev : `POST /api/dev/test-resend` (auth requise, dev only)

### 6.3 SIRENE API (prospection)

- [ ] Test recherche par SIRET : `/api/sirene/search?siret=73282932000074` → résultat Apple France
- [ ] Test recherche par mot-clé : `/api/sirene/search?q=apple` → liste 8 résultats
- [ ] Rate limit : 31 recherches en 1 min → toast 429 « Trop de recherches »
- [ ] Erreur SIRENE upstream → retour `{ results: [], error: 'Upstream 500' }` sans crash

### 6.4 PostHog (analytics)

- [ ] Events trackés à vérifier dans dashboard PostHog :
  - `signup_completed` / `signup_failed`
  - `invitation_accepted` / `invitation_accept_failed`
  - `onboarding_step_completed` (steps 2-5)
  - `onboarding_step_skipped` (steps 2-5)
  - `onboarding_completed` (avec next_target)
  - `opportunity_created` (source: manual / sirene_api)
  - `quote_sent`
  - `recurrence_created` / `recurrence_deactivated`

### 6.5 Sentry (error tracking)

- [ ] Test client error : `/sentry-example-page` → trigger error → visible dans Sentry
- [ ] Test server error : invitation server action avec données invalides → erreur capturée
- [ ] Vérifier : source maps uploadées (release tag = git SHA)
- [ ] Vérifier : pas de leak PII (email, token) dans les logs Sentry

---

## 7. Sécurité & RBAC

### 7.1 Multi-tenant isolation

- [ ] Owner company A se connecte → ne voit AUCUNE donnée de company B
- [ ] Owner B tente de fetch `?company_id=company-A` directement → RLS bloque (0 rows)
- [ ] Mission de company A : agent de company B tente d'y accéder par URL `/agent/mes-missions` → vide

### 7.2 RBAC permissions

- [ ] Sales tente `POST /api/dev/test-resend` → 403
- [ ] Agent tente `/parametres` → redirect `/agent/mon-agenda`
- [ ] Admin tente `updateCompanyInfo` avec nouveau SIRET → 403 RLS (owner only)
- [ ] Tester l'URL directe `/rentabilite/rentabilite-client` en tant que sales → redirect car permission analytics:read filtrée
- [ ] Tester le cookie session manipulé → invalide → redirect `/login`

### 7.3 Rate limiting

- [ ] 6 magic-links en 10 min même email → toast « Trop de tentatives »
- [ ] 11 invitations en 10 min même owner → toast erreur
- [ ] 21 recherches SIRENE en 1 min → 429
- [ ] 21 recherches prospecting en 1 min → 429
- [ ] 6 quotes/send en 1 min → 429

### 7.4 Validation des entrées

- [ ] Tous les forms : Zod validation côté server, message FR si invalide
- [ ] `/api/quotes/send` : body invalide → 400 avec message
- [ ] line_items > 500 lignes → 400 « Trop d'éléments »
- [ ] Email invalide partout → erreur claire

### 7.5 Headers HTTP

- [ ] `X-Frame-Options: DENY` → vérifier dans DevTools Network
- [ ] `X-Content-Type-Options: nosniff`
- [ ] CSP présent, autorise *.supabase.co + sentry + posthog + resend + docuseal + recherche-entreprises.api.gouv.fr
- [ ] `frame-ancestors 'none'`

---

## 8. Mobile & responsive

Tester en DevTools mobile view (iPhone 12 mini = 375px, iPad portrait = 768px).

### 8.1 À 375px

- [ ] Aucune scrollbar horizontale sur les 14 routes publiques + auth
- [ ] Menu hamburger fonctionne (toggle sidebar overlay)
- [ ] Forms restent utilisables (champs > 32px de hauteur)
- [ ] Tables horizontalement scrollables sur les pages : heures-paie, agents/mes-missions, parametres/services, clients-sites
- [ ] KPI strips passent en 2 colonnes au lieu de 4-5
- [ ] Dialog modaux : pas de débordement, scrollables verticalement
- [ ] Pipeline Kanban : scrollable horizontalement
- [ ] Cmd+K search : input reste visible et tappable

### 8.2 À 768px (tablette)

- [ ] KPI strips passent en 3-4 colonnes
- [ ] Sidebar visible permanent
- [ ] Forms en 2 colonnes
- [ ] Tables non-scrollables horizontalement

### 8.3 PWA (post-beta, à vérifier après activation)

- [ ] Manifest.json présent
- [ ] Icon install proposé sur mobile
- [ ] Service worker enregistré

---

## 9. Performance & limites

### 9.1 Quotas

- [ ] **Sièges** : 1 owner + 5 collaborateurs max. Tester invitation 6e → toast « Limite atteinte »
- [ ] **CSV import** : 200 lignes simulées → tout passe
- [ ] **Quote line items** : 500 max (cap server)
- [ ] **Recherche SIRENE** : 8 résultats max par page (param API)
- [ ] **Pagination listes** : 20/page (clients, sites), 12/page (agents cards)

### 9.2 Temps de chargement

- [ ] `/dashboard` < 2s sur connexion 4G simulée
- [ ] `/commercial/pipeline` avec 50+ opps < 3s
- [ ] `/operations/planning` avec 200+ missions < 3s
- [ ] Premier signup → onboarding step 2 < 1s après click magic-link

### 9.3 Erreurs réseau

- [ ] Désactiver Wi-Fi pendant un submit → toast erreur réseau
- [ ] Réactiver → retry → succès
- [ ] Supabase down (chaos engineering) → page d'erreur gracieuse, pas de crash blanc

---

## 10. Régressions à vérifier après chaque déploiement

### Smoke test 10 minutes

1. [ ] `/login` charge
2. [ ] `/signup` charge
3. [ ] Cmd+K depuis dashboard → modal ouvre, ferme avec Escape
4. [ ] `/operations/planning` → ajouter une mission avec conflit agent → toast erreur
5. [ ] `/parametres > Simulateur` → simulation prix avec valeur custom
6. [ ] `/agent/mon-agenda` (en tant qu'agent) → mission visible
7. [ ] Sentry release ID correspond au SHA déployé
8. [ ] Vercel deployment success sur le commit attendu

### Régressions classiques

- [ ] **Onboarding** : un nouvel owner peut faire le wizard complet sans erreur console
- [ ] **Invitation** : nouveau collaborateur reçoit email + arrive sur dashboard après accept
- [ ] **Audit log** : une création de mission apparaît bien dans le journal
- [ ] **DocuSeal** : webhook test trigger → quote passe à `signe`
- [ ] **Cron** : `/api/cron/recurrences` répond 200 avec bearer correct
- [ ] **Migration DB** : nouvelle migration applique sans erreur en Supabase preview

---

## 11. Bugs courants & comment les reproduire

### B1. Conflict planning agent

**Reproduction** :
1. Créer mission Lundi 9h-11h sur Sophie
2. Créer mission Lundi 10h-12h sur Sophie

**Attendu** : 2e création bloquée, toast « Sophie est déjà sur une mission le YYYY-MM-DD de 09:00 à 11:00 »

**Si bug** : `assignAgentsToMission` ne fait pas le check ou retourne `ok: true` quand même

### B2. Étape onboarding bloquée

**Reproduction** :
1. Owner skip étape 3 (services)
2. Aller manuellement sur `/onboarding/4`

**Attendu** : redirect automatique vers `/onboarding/5` (step 4 skipped auto)

**Si bug** : page step 4 affiche un form, peut être resoumise

### B3. Sidebar non actualisé

**Reproduction** :
1. Owner promeut un sales en admin
2. Sales reload sa page

**Attendu** : sidebar affiche maintenant le lien Paramètres + RH

**Si bug** : sidebar reste figée → demander à se reconnecter

### B4. Magic-link expiré

**Reproduction** :
1. Demander magic-link
2. Attendre 1h+
3. Cliquer le lien

**Attendu** : redirect `/login?error=expired` avec toast clair

### B5. Mobile overflow

**Reproduction** :
1. DevTools mobile 375px
2. Aller sur `/rh/heures-paie`
3. Date range avec 100+ entries

**Attendu** : table scrollable horizontalement DANS la page, pas overflow du body

### B6. Quote multi-services

**Reproduction** :
1. Step 1 : ajouter 2 services (bureaux + vitres)
2. Pour chacun, configurer pricing_rule au préalable
3. Step 4

**Attendu** : 2 ServiceBreakdown avec badge « Tes règles » chacun, total combiné en bas

**Si bug** : 1 seul badge « Tes règles », l'autre « Standard » alors qu'une rule existe → vérifier mapping SERVICE_CATEGORY_TO_DEFAULT_NAME

---

## 12. Checklist GO/NO-GO avant nouveau déploiement

- [ ] `npm run typecheck` → 0 erreur
- [ ] `npm run lint` → 0 warning
- [ ] `npm test` → 124/124 vitest pass
- [ ] `npm run build` → vert
- [ ] Playwright smoke (`smoke.spec.ts` + `mobile.spec.ts`) → vert sur 2 viewports
- [ ] Vercel preview deployment → success
- [ ] Supabase preview migration → success (pas d'erreur de colonne)
- [ ] Sentry source maps uploadées (si activé)
- [ ] PR review : pas de `console.log` accidentel, pas de TODO ajouté
- [ ] Smoke test 10 min effectué sur preview URL

---

## Annexe — Variables d'environnement attendues

| Var | Côté | Obligatoire prod | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | ✅ | URL projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | ✅ | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | ✅ | Service role (admin) |
| `NEXT_PUBLIC_APP_URL` | client + server | ✅ | URL publique (https://app.proprely.fr) |
| `RESEND_API_KEY` | server | ⚠️ | Optionnel (fallback Supabase email) |
| `DOCUSEAL_API_KEY` | server | ✅ pour signature | API key DocuSeal |
| `DOCUSEAL_WEBHOOK_SECRET` | server | ✅ pour signature | Secret HMAC |
| `CRON_SECRET` | server | ✅ pour crons | Bearer pour /api/cron/* |
| `NEXT_PUBLIC_POSTHOG_KEY` | client | optionnel | PostHog API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | client | optionnel | Default eu.i.posthog.com |
| `NEXT_PUBLIC_SENTRY_DSN` | client + server | optionnel | Sentry DSN |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | server build-time | optionnel | Source maps upload |

---

*Dernière mise à jour : à compléter par l'équipe à chaque sprint.*
*Voir aussi : `RUNBOOK.md` (incident response) et `BETA_CHECKLIST.md` (release prep).*
