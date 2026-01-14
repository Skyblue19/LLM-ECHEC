# Story 4 — Défis personnalisés + progression

## Epic
Epic 4 : Historique local + défis

## User Story
En tant qu’utilisateur (Elo 1600–2200), je veux :
- Choisir un défi pédagogique (ex: “Trouve le plan”, “Identifie la menace”)
- Voir ma progression locale (sessions complétées, thèmes travaillés)
- Recevoir des défis adaptés à mon niveau

## Acceptance Criteria

- [X] L’UI propose une liste de défis prédéfinis avec descriptions
- [X] Chaque défi génère une FEN adaptée au niveau (1600–2200 Elo)
- [X] La progression est sauvegardée localement (défis complétés, score)
- [X] L’afficheur de progression montre : sessions totales, thèmes, taux de réussite

## Technical Notes

- Utiliser `docs/architecture/tech-stack.md` comme référence (Node.js, JSON local).
- Créer `app/data/defis.json` avec des positions prédéfinies.
- Créer `app/data/progression.json` pour suivre la progression.
- Pas de génération de positions complexes pour POC : utiliser des FEN fixes.
- Interface simple : liste déroulante de défis + bouton “Lancer le défi”.

## Implementation Tasks

1. **Créer** `app/data/defis.json` avec 5-10 défis prédéfinis
2. **Créer** `app/data/progression.json` pour stocker la progression
3. **Ajouter** un sélecteur de défis dans l’UI (dropdown)
4. **Ajouter** un bouton “Lancer le défi”
5. **Implémenter** `loadDefi()` et `updateProgression()`
6. **Afficher** la progression (sessions, score, thèmes)

## Out of Scope

- Génération automatique de positions complexes
- Synchronisation cloud de la progression
- Mode multijoueur ou compétition

## Rationale

Permet à l’utilisateur de s’entraîner de manière structurée avec des objectifs clairs, tout en suivant sa progression locale. Aligne sur Epic 4 (Historique local + défis) et complète le POC avec une boucle d’apprentissage complète.
