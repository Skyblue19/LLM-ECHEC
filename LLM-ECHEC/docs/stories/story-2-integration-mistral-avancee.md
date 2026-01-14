# Story 2 — Intégration avancée Mistral

## Epic
Epic 2 : Intégration Mistral API (prompts, formats de réponse, erreurs)

## User Story
En tant qu’utilisateur (Elo 1600–2200), je veux que l’application puisse :

- **Obtenir** des réponses Mistral structurées et pédagogiques
- **Comprendre** les erreurs éventuelles (clé, quota, réseau)
- **Réinitialiser** facilement l’analyse pour recommencer

## Acceptance Criteria

- [X] Le prompt Mistral est amélioré pour des réponses structurées (3 sections)
- [X] Les erreurs API sont gérées avec messages clairs (401, 429, réseau)
- [X] L'UI propose un bouton "Réinitialiser" pour effacer les résultats
- [X] Les logs console aident au debug (sans exposer de données sensibles)

## Technical Notes

- Utiliser `docs/architecture/tech-stack.md` comme référence (Node.js, fetch, pas de framework).
- Améliorer le prompt système pour structurer la réponse en 3 sections.
- Gérer les erreurs API avec messages spécifiques (401, 429, réseau).
- Ajouter des logs console pour debug sans exposer de données sensibles.
- Bouton "Réinitialiser" pour effacer status/result/error.

## Out of Scope

- Interface web pour gérer plusieurs sessions (POC).

## Rationale

Améliore l’expérience utilisateur avec des réponses Mistral plus claires, des erreurs explicites et un contrôle total sur l’interface. Aligne sur Epic 2 (Intégration Mistral).
