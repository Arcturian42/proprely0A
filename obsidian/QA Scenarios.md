# QA Scenarios

→ [[Home]] | [[Beta Status]] | Source complète : [`docs/BETA_SCENARIOS.md`](../docs/BETA_SCENARIOS.md)

---

## Prérequis

Environnement Supabase preview seedé avec au moins une `companies` + un owner + un agent.

---

## Scénario 1 — Onboarding complet (nouveau owner)

**Objectif** : valider que l'onboarding 6 étapes ne bloque jamais un owner.

Étapes : `/signup` → magic link → étape 2 (équipe) → étape 3 (services) → étape 4 (tarification) → étape 5 (pricing settings) → étape 6 (confirmation) → `/dashboard`.

**Résultats attendus :**
- ✅ Company créée avec slug unique + profil `owner` lié
- ✅ Email d'invitation envoyé via Resend
- ✅ `service_types`, `pricing_rules`, `company_pricing_settings` peuplés
- ✅ `audit_logs` : insert `companies` + `profiles`

---

## Scénario 2 — Cycle devis signé

**Objectif** : créer un devis depuis le pipeline et le faire signer via Docuseal.

Étapes : créer lead (pipeline) → qualifier → créer devis → remplir détail prestations → envoyer → simuler signature client → vérifier statut "signé".

**Résultats attendus :**
- ✅ Numéro devis `DEV-YYYY-NNNN` unique et persistant
- ✅ Docuseal reçoit la soumission
- ✅ Webhook `/api/docuseal/webhook` validé (HMAC) → devis → "signé"
- ✅ Notification envoyée au commercial

---

## Scénario 3 — Mission cycle complet

**Objectif** : créer et conclure une mission de A à Z.

Étapes : créer mission (cockpit) → assigner agent → agent pointe ses heures → manager valide → mission → "terminée".

**Résultats attendus :**
- ✅ Agent reçoit notification d'assignation
- ✅ Snapshot agent ne voit pas `hourly_cost` des collègues
- ✅ `time_entries` avec colonne "Écart" et color-coding
- ✅ `audit_logs` : insert `missions` + `mission_agents` + `time_entries`

---

## Scénario 4 — Issue mission + notification

**Objectif** : valider la remontée d'un incident terrain.

Étapes : agent signale une issue (catégorie obligatoire + description ≥ 10 car.) → managers reçoivent notification `critical` → `<NotificationBell>` affiche badge.

**Résultats attendus :**
- ✅ `missions.issue_category` et `issue_description` enregistrés
- ✅ Notification fan-out vers tous les `mission:write`
- ✅ Badge unread dans sidebar, dropdown avec détail

---

## Scénario 5 — Isolation tenant (sécurité critique)

**Objectif** : vérifier qu'une entreprise B ne voit jamais les données de l'entreprise A.

Prérequis : 2 companies seedées (A + B), un user owner dans chaque.

**Résultats attendus :**
- ✅ Owner B ne voit aucun client / agent / devis de A (store + UI)
- ✅ RLS refuse les requêtes cross-tenant (tester avec `service_role` désactivé)
- ✅ Snapshot sales B : `hourly_cost` redacté, pas de `time_entries` d'A
- ✅ Snapshot agent B : uniquement ses propres missions

---

## Checklist de sortie

Cocher chaque scénario avant d'inviter les 15 sociétés :

- [ ] Scénario 1 — Onboarding complet
- [ ] Scénario 2 — Cycle devis signé
- [ ] Scénario 3 — Mission cycle complet
- [ ] Scénario 4 — Issue + notification
- [ ] Scénario 5 — Isolation tenant
- [ ] `/api/health` → 200 toutes intégrations
- [ ] Sentry alerts configurées
- [ ] Realtime activé (`missions` + `notifications`)

---

## Voir aussi
- [[Beta Status]] — Reste à faire (ops)
- [[Deployment]] — Variables et smoke tests
