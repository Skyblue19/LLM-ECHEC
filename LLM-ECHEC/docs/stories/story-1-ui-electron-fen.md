# Story 1 — UI Electron + FEN + Échiquier

## Epic
Epic 1 : Application Electron POC (UI + affichage position)

## User Story
En tant qu’utilisateur (Elo 1600–2200), je veux pouvoir :
- Saisir une FEN
- Vérifier et afficher l’échiquier correspondant
- (Optionnel) lancer une analyse Mistral sur la position

## Acceptance Criteria

- [X] La FEN est correctement parsée et l’échiquier s’affiche
- [X] Le bouton “Analyser (Mistral)” appelle bien l’API (si clé présente)
- [X] Les erreurs FEN sont clairement affichées (sans crash)
- [X] L’UI reste responsive et utilisable en plein écran

## Technical Notes

- Utiliser les composants déjà présents dans `app/renderer/renderer.js` (parseFEN, renderBoard, setError, setMeta).
- Pour l’appel Mistral, réutiliser le canal IPC déjà existant (`window.mistral.analyze`).
- Ne pas modifier la structure de fichiers existants ; juste étendre si nécessaire.

## Out of Scope

- Gestion multi-sessions (futur)
- Sauvegarde/chargement de parties (PGN)
- Mode multi-joueurs

## Implementation Tasks

1. **[X] Vérifier** que la Story 1 est bien implémentée dans `app/`
2. **[X] Corriger** si le bouton “Analyser” n’appelle pas l’IPC
3. **[X] Ajouter** un feedback visuel simple (ex: “FEN chargée”, “Analyse en cours…”)
4. **[X] Tester** avec des FEN valides et invalides
5. **[X] Ajouter** les coordonnées A1-H8 sur l’échiquier
6. **[X] Améliorer** la responsivité (mobile, tablette)

## Rationale

Cette story sert de **fondation** au POC. Elle est déjà quasi complète (UI + pipeline Mistral). La formaliser permet :
- De s’assurer que les agents SM/Dev/QA aient une base claire
- De valider que le POC respecte l’architecture shardée
- De permettre le suivi des stories suivantes (Epic 2+)
