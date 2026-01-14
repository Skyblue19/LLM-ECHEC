# LLM Échec — POC

Application Electron locale pour l’apprentissage des échecs avec un tuteur IA (Mistral).

## Installation

1. Clone le repo
2. `cd app`
3. `npm install`
4. Copie `.env.example` en `.env` et mets ta clé Mistral :
   ```bash
   cp .env.example .env
   # Édite .env et ajoute ta clé
   ```
5. `npm start`

## Utilisation

1. Entre une FEN (ex: `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1`)
2. Clique “Charger” pour voir l’échiquier
3. Clique “Analyser (Mistral)” pour obtenir une explication pédagogique

## Projet

- **PRD** : `docs/prd/`
- **Architecture** : `docs/architecture/`
- **Stories** : `docs/stories/`
- **Code** : `app/`

## Développement

Ce projet suit la méthode BMAD (agents PM, Architect, SM, Dev, QA).

## Licence

POC — usage interne uniquement.
