# Story 3 — Stockage local des sessions (JSON)

## Epic
Epic 4 : Historique local + défis

## User Story
En tant qu’utilisateur (Elo 1600–2200), je veux pouvoir :
- Sauvegarder ma session d’apprentissage (FEN + réponses Mistral)
- Recharger une session précédente
- Voir un résumé des thèmes travaillés et erreurs récurrentes

## Acceptance Criteria

- [X] La session est sauvegardée dans `app/data/session-{timestamp}.json`
- [X] Le JSON contient : timestamp, FEN, réponses Mistral brutes, thèmes extraits, erreurs récurrentes
- [X] L’UI propose “Recharger session” avec sélecteur de fichiers JSON existants
- [X] Pas d’erreur si le JSON est mal formé (fallback silencieux)

## Technical Notes

- Utiliser `docs/architecture/tech-stack.md` comme référence (Node.js, JSON local, pas de base de données).
- Structurer le JSON : `session` → `{ timestamp, fen, responses, themes, errors }`
- Pas de stockage de clé ou de données personnelles.
- Utiliser `fs/promises` pour écriture/lecture async (non bloquant).

## Implementation Tasks

1. **Créer** `app/data/` s’il n’existe pas
2. **Ajouter** un bouton “Sauvegarder session” dans l’UI
3. **Ajouter** un bouton “Recharger session” avec sélecteur de fichiers
4. **Implémenter** `saveSession()` et `loadSession()` dans le renderer
5. **Utiliser** IPC pour l’accès fichiers (renderer ne peut pas écrire directement)

## Out of Scope

- Interface web pour gérer plusieurs sessions (POC)
- Synchronisation cloud

## Rationale

Permet à l’utilisateur de suivre sa progression et de bénéficier d’un historique structuré sans sortir du POC local. Aligne sur Epic 4 (Historique local + défis).
