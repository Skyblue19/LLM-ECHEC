# Story 5 — Critique de coup + analyse

## Epic
Epic 3 : Parcours pédagogique en 4 phases

## User Story
En tant qu’utilisateur (Elo 1600–2200), je veux :
- Saisir un coup que j’ai joué dans une position
- Recevoir une analyse critique de mon coup (qualité, justesse, alternatives)
- Comprendre pourquoi mon coup était bon/mauvais avec des explications pédagogiques

## Acceptance Criteria

- [ ] L’UI propose une zone de saisie de coup (notation algébrique)
- [ ] Le bouton “Analyser mon coup” appelle Mistral avec un prompt spécialisé
- [ ] L’analyse retourne : 1) évaluation du coup, 2) alternatives meilleures, 3) explication pédagogique
- [ ] L’analyse est sauvegardée dans la session courante
- [ ] L’échiquier met en évidence le coup analysé (surbrillance)

## Technical Notes

- Utiliser `docs/architecture/tech-stack.md` comme référence (Node.js, Mistral, JSON local).
- Notation algébrique standard : ex: “e2e4” pour “pion e vers e4”
- Prompt Mistral spécialisé pour la critique : demande d’évaluer un coup spécifique dans une position.
- Sauvegarder l’analyse dans la session JSON existante (pas de nouveau fichier).
- Mettre en évidence le coup sur l’échiquier avec CSS (border, background).

## Implementation Tasks

1. **Ajouter** une zone de saisie de coup dans l’UI (notation algébrique)
2. **Ajouter** un bouton “Analyser mon coup” à côté de la zone de saisie
3. **Créer** un prompt Mistral spécialisé pour la critique de coup
4. **Implémenter** `analyzeMove()` qui combine FEN actuelle + coup saisi
5. **Mettre en évidence** le coup analysé sur l’échiquier (CSS highlight)
6. **Sauvegarder** l’analyse dans la session JSON courante

## Out of Scope

- Analyse de parties complètes (PGN)
- Mode multijoueur ou compétition
- Base de données de coups (pour POC, session JSON suffit)

## Rationale

Permet de compléter la boucle pédagogique (Phase 3 → Feedback) en offrant une analyse critique des coups de l’utilisateur. C’est une fonctionnalité clé pour l’apprentissage actif et corrige le manque identifié dans FR5 du PRD. Aligne sur Epic 3 (Parcours 4 phases) et finalise le POC.
