# Proprely Admin — Documentation Hub

SaaS de gestion pour entreprises de propreté — pipeline commercial, planning des missions, gestion d'agents, devis avec signature électronique.

---

## Navigation

### Technique
- [[Architecture]] — Multi-tenancy, RBAC, flux de données
- [[Stack]] — Technos, structure du repo
- [[RBAC & Permissions]] — Rôles, guards, matrice de permissions
- [[Database]] — Supabase, migrations, schéma

### Opérationnel
- [[Dev Setup]] — Installation locale, variables d'env, scripts
- [[Deployment]] — Vercel, Supabase prod, variables requises
- [[Operations]] — Runbook incidents, health check

### Projet
- [[Branch Strategy]] — Branches actives, conventions, archivées
- [[Beta Status]] — Checklist lancement, sprints terminés, reste à faire
- [[QA Scenarios]] — 5 scénarios bout-en-bout à valider avant ouverture

---

## Fichiers source (ne pas modifier)
- [`README.md`](../README.md) — Vue d'ensemble technique complète
- [`BRANCHES.md`](../BRANCHES.md) — Stratégie de branches détaillée
- [`docs/RUNBOOK.md`](../docs/RUNBOOK.md) — Playbooks incidents complets
- [`docs/BETA_CHECKLIST.md`](../docs/BETA_CHECKLIST.md) — Checklist bêta détaillée
- [`docs/BETA_SCENARIOS.md`](../docs/BETA_SCENARIOS.md) — Scénarios QA complets
- [`supabase/README.md`](../supabase/README.md) — Workflow migrations

---

## État actuel
- **Branche** : `main` (protection PR-only)
- **Phase** : Bêta privée — 15 entreprises cibles
- **CI** : Lint · Typecheck · Test · Build sur chaque PR
