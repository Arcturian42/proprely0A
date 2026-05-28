# Branch Strategy

→ [[Home]] | Source complète : [`BRANCHES.md`](../BRANCHES.md)

---

## Branche par défaut

**`main`** — production. PR-only, pas de commit direct, pas de force-push.

---

## Conventions

| Préfixe | Usage | Exemple |
|---------|-------|---------|
| `main` | Production unique, PR-only | — |
| `feat/<sujet>` | Nouvelle feature | `feat/multi-tenant-rbac` |
| `fix/<sujet>` | Correctif | `fix/store-company-scoping` |
| `chore/<sujet>` | Hygiène (deps, lint, doc) | `chore/upgrade-next-16-3` |
| `archive/<sujet>` | Préservation historique | `archive/auth-signup-pr4` |
| `backup/<date>` | Snapshot avant opération risquée | `backup/pre-cleanup-2026-05-17` |

**Une PR = une intention.** Si une PR dépasse 30 fichiers, la découper.
**Base toujours `main`** sauf cas explicite documenté dans BRANCHES.md.

---

## Phases terminées

| Phase | Sujet | PR | Statut |
|-------|-------|----|--------|
| A | Setup main + backups + archivages | — | ✅ |
| B | Multi-tenant + RBAC + RLS | #13 | ✅ |
| C | Auth Supabase réelle (magic link + signup) | #14 | ✅ |
| D | Système d'invitations admin & agent | #15 | ✅ |
| E | Espace agent `/agent/*` + role gating | #16 | ✅ |
| F | Audit `main` pré-bêta | — | ✅ |

---

## Branches archivées (ne pas supprimer)

| Branche | Contenu | Notes |
|---------|---------|-------|
| `archive/auth-signup-pr4` | Premier auth Supabase + OAuth Google | Pattern `getOrCreateUserProfile` utile |
| `archive/auth-store-async-pr5` | Auth async + RLS | — |
| `archive/pipeline-vocal-pr6` | QuoteBuilder vocal Web Speech API, jsPDF | Patterns récupérables |
| `archive/factures-contrats-documents-pr7` | Pages Devis + Factures + Contrats | Hors scope beta, V1+ |
| `archive/quote-generation-pr8` | QuoteFlow (déjà dans main) | Pour comparaison |
| `archive/prospecting-v1-pr3` | Premier redesign AI prospecting | Superseded par #9 |
| `archive/prospecting-sirene-pr9` | AI prospecting SIRENE (déjà dans main) | — |
| `archive/cockpit-kanban-pr11` | Cockpit Kanban + scheduling (déjà dans main) | — |

---

## Récupérer du travail archivé

```bash
# Voir le diff d'une archive vs main
git fetch origin
git log --oneline main..origin/archive/<nom>

# Cherry-pick un commit précis
git cherry-pick <sha>
```

---

## Voir aussi
- [[Beta Status]] — Roadmap et état des sprints
