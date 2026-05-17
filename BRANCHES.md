# BRANCHES.md — Stratégie & état des branches

> Document maintenu à jour à chaque phase de cleanup ou de feature. Lis ce fichier avant d'ouvrir une PR.

**Date de cleanup initial** : 2026-05-17

---

## Branche par défaut

**`main`** — branche de production. Tout merge passe par une PR validée.

Aucun commit direct sur `main` n'est autorisé hors PR mergée. Aucune force-push n'est autorisée sur `main`.

---

## Snapshot du cleanup 2026-05-17

Avant le cleanup, le repo avait 11 PRs ouvertes en parallèle et utilisait `claude/proprely-admin-mvp-hwhhz` (puis `claude/qa-fixes-on-redesign`) comme trunk de fait. Le cleanup a :

1. Établi `main` à partir de `claude/qa-fixes-on-redesign` (HEAD `643448c`) — qui contenait déjà QuoteFlow + AI prospecting SIRENE + Cockpit Kanban + SignNow + migrations Supabase versionnées.
2. Posé une branche `backup/pre-cleanup-2026-05-17` pointant sur le même commit pour rollback complet.
3. Créé 8 branches `archive/*` préservant le travail des PRs fermées (rien n'est perdu).
4. Fermé 9 PRs (8 archivées, 1 superseded), gardé 1 PR ouverte (#10 multi-tenant) pour Phase B.

---

## Branches actives

| Branche | Rôle | Protection | Source |
|---|---|---|---|
| `main` | Production | PR-only, no force-push | Cleanup 2026-05-17 (ex `claude/qa-fixes-on-redesign`) |
| `backup/pre-cleanup-2026-05-17` | Snapshot rollback du cleanup | Read-only | qa-fixes-on-redesign @ 643448c |

---

## Branches archivées (préservées, ne pas supprimer sans accord)

Préfixe : `archive/`. Aucun travail futur dessus. Servent uniquement de référence si on veut récupérer du code.

| Branche | Origine PR | Contenu sauvegardé | Statut PR |
|---|---|---|---|
| `archive/auth-signup-pr4` | PR #4 | Premier essai auth Supabase + signup self-serve + OAuth Google + DataProvider + middleware. Pattern `getOrCreateUserProfile` utile pour Phase C. | Closed |
| `archive/auth-store-async-pr5` | PR #5 | Second essai auth + store async + login page + RLS. Concurrent de #4. | Closed |
| `archive/pipeline-vocal-pr6` | PR #6 | Pipeline tabs (Resume/Notes/Tasks/Quotes/Emails/Calls/Files/Timeline), QuoteBuilder vocal Web Speech API, jsPDF, intégration Resend. **Superseded par QuoteFlow déjà en main.** Patterns vocal/jsPDF récupérables. | Closed |
| `archive/factures-contrats-documents-pr7` | PR #7 | Pages Devis + Factures + Contrats + ClientDocuments (DMC/DEAP/RIB) + Tasks. Hors scope MVP beta. À ré-introduire sélectivement post-beta. | Closed |
| `archive/quote-generation-pr8` | PR #8 | QuoteFlow + CardDetailPanel + pricing engine + Yousign. **Déjà intégré dans main** via commits `a29b083`, `ac6b778`, `3e20efa`. Branche conservée pour comparaison. | Closed |
| `archive/prospecting-v1-pr3` | PR #3 | Premier essai redesign AI prospecting. Superseded par #9. | Closed |
| `archive/prospecting-sirene-pr9` | PR #9 | AI prospecting SIRENE swipe deck. **Déjà intégré dans main** via commit `2e15dba`. | Closed |
| `archive/cockpit-kanban-pr11` | PR #11 | Cockpit Kanban + OrganizationWizard + AgentProfilePanel + scheduling. **Déjà intégré dans main** via commit `b472e50`. | Closed |

---

## PRs ouvertes restantes

| PR | Branche | Sujet | Prochaine action |
|---|---|---|---|
| **#10** | `claude/qa-review-bugs-yCGVK` | Multi-tenant + RBAC (7 rôles, 29 permissions) + RLS SQL + audit_logs + profiles + dummy auth provider | **Phase B du cleanup** — rebase sur main, résoudre conflits sur `mock-data.ts`/`store.ts`/`types/index.ts`/`schema.sql`, ouvrir PR `feat/multi-tenant-rbac → main` |

---

## Conventions de branches (à partir de maintenant)

| Préfixe | Usage | Exemple |
|---|---|---|
| `main` | Production unique. PR-only. | — |
| `feat/<sujet>` | Nouvelle feature | `feat/multi-tenant-rbac`, `feat/auth-real`, `feat/invitations` |
| `fix/<sujet>` | Correctif | `fix/store-company-scoping` |
| `chore/<sujet>` | Hygiène (deps, lint, doc) | `chore/upgrade-next-16-3` |
| `archive/<sujet>` | Préservation historique d'un travail abandonné ou superseded | `archive/auth-signup-pr4` |
| `backup/<date>` | Snapshot avant opération risquée | `backup/pre-cleanup-2026-05-17` |

**Une PR = une intention.** Pas de "tout-en-un". Si une PR commence à dépasser 30 fichiers, la découper.

**Base toujours `main`**. Aucune PR ne doit cibler une autre branche feature comme base (sauf cas explicite documenté ici).

---

## Roadmap cleanup post-2026-05-17

| Phase | Sujet | Branche feature | Statut |
|---|---|---|---|
| A | Setup main + backups + archivages + BRANCHES.md | — | ✅ Terminé |
| B | Merge multi-tenant + RBAC + RLS (PR #10) | `feat/multi-tenant-rbac` | ⏳ À démarrer |
| C | Auth Supabase réelle (magic link + signup self-serve) | `feat/auth-real` | À venir |
| D | Système d'invitations admin & agent | `feat/invitations` | À venir |
| E | Route groups admin vs agent + middleware role gating | `feat/route-groups` | À venir |
| F | Re-audit du `main` consolidé pour identifier les manques avant beta 15 entreprises | — | À venir |

---

## Pour récupérer du travail archivé

```bash
# Voir le diff d'une archive vs main
git fetch origin
git log --oneline main..origin/archive/<nom>

# Cherry-pick un commit précis
git cherry-pick <sha>

# Ou créer une nouvelle branche feature à partir d'une archive
git checkout -b feat/<sujet> origin/archive/<nom>
```

---

*Maintenu par le pipeline de cleanup Claude Code. Mettre à jour à chaque changement de stratégie de branches.*
