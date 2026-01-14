# PRD — LLM Échec (POC)

## 1. Informations générales
- Projet : Environnement Informatique d'Apprentissage Humain (EIAH) intégrant une IA générative
- Titre : LLM Échec
- Année : 2025–2026
- Institution : Master AMINJ — Institut Jean François Champollion
- Responsables : Idrissa Seck (Doctorant), Pr. Michel Galaup (Serious Game Research Lab)

## 2. Contexte & justification
### Problème
Les outils numériques d’échecs évaluent efficacement les coups (bon/mauvais), mais n’offrent pas d’explications pédagogiques adaptées en langage naturel.

### Hypothèse
Un tuteur IA capable de produire un feedback contextualisé et personnalisé peut améliorer l’apprentissage autonome, la motivation et la compréhension stratégique.

### Enjeux
- Fiabilité et cohérence des explications
- Intégration technique fluide dans une app locale
- Respect du RGPD
- Prévention de la dépendance à l’assistance (indices graduels)

## 3. Objectifs
### Objectifs pédagogiques (Bloom)
- O1 (Analyser) : analyser une position et identifier des plans stratégiques
- O2 (Analyser) : anticiper les intentions adverses via questionnement guidé
- O3 (Évaluer) : choisir et justifier un plan stratégique par l’argumentation

### Objectifs produit (POC)
- Produire des explications compréhensibles et utiles pour un public Elo 1600–2200
- Proposer un parcours guidé en 4 phases (Découverte → Analyse → Feedback → Progression)
- Démontrer la faisabilité d’intégration d’un LLM (Mistral API) dans une app Electron

## 4. Public cible
- Francophones, 10 ans et plus
- Niveau intermédiaire à avancé (Elo 1600–2200)
- Aucun prérequis technique ; familiarité basique avec des IA génératives

### Personas
- Titouan (28 ans, 1800 Elo) : veut progresser en compétition, recherche des plans et explications structurées
- Jacqueline (14 ans, 1600 Elo) : habituée aux IA, aime le dialogue et les retours rapides

## 5. Portée (scope)
### MVP (POC) — inclus
- Analyse pédagogique d’une position + suggestion de plans
- Dialogue guidé (style socratique) avec indices graduels
- Parcours en 4 phases
- Historique local (JSON) : sessions, thèmes, erreurs récurrentes

### Hors-scope (POC)
- Scalabilité, multi-comptes, backend serveur, cloud
- Intégrations Lichess/Chess.com
- Fonctionnement offline sans internet (Mistral API obligatoire)

### Option (si simple) : moteur d’échecs
- Stockfish peut être ajouté comme composant optionnel pour fiabiliser/étalonner certaines évaluations

## 6. Parcours pédagogique (user journey)
- Phase 1 — Découverte (10–15 min, asynchrone)
  - L’utilisateur charge une position et décrit ce qu’il voit (menaces, plans)
- Phase 2 — Analyse (15–20 min, asynchrone)
  - L’utilisateur propose un ou plusieurs coups candidats et justifie
- Phase 3 — Feedback (10–15 min, asynchrone)
  - L’IA fournit un feedback : points justes, erreurs, idées manquées, pistes d’amélioration
- Phase 4 — Progression (durée variable, synchrone)
  - Dialogue interactif : indices graduels, variantes seulement sur demande explicite

## 7. Exigences fonctionnelles (FR)
### Entrées & représentation
- FR1 : saisir/charger une position
  - MVP : FEN
  - Option : import PGN (itération ultérieure si nécessaire)
- FR2 : afficher la position (échiquier) et métadonnées (trait aux blancs/noirs)

### Tuteur IA
- FR3 : demander une analyse stratégique de la position
- FR4 : demander un questionnement guidé (sans donner la solution immédiatement)
- FR5 : demander une critique d’un coup proposé par l’utilisateur (avec justification)
- FR6 : demander un feedback final structuré (synthèse + axes de progrès)

### Progression & gamification
- FR7 : proposer des défis (objectifs simples : “trouver un plan”, “identifier la menace”, etc.)
- FR8 : suivre la progression locale (historique JSON)

## 8. Exigences non fonctionnelles (NFR)
- NFR1 (Simplicité POC) : architecture locale simple, pas de contraintes de montée en charge
- NFR2 (RGPD) : minimisation de données, stockage local, pas de données personnelles nécessaires
- NFR3 (Pédagogie) : indices graduels ; la solution/ligne ne doit apparaître que si l’utilisateur la demande explicitement
- NFR4 (Robustesse) : gestion d’erreurs réseau/API, messages clairs

## 9. Contraintes techniques
- Frontend : Electron (React ou Vue)
- Backend : Node.js intégré à Electron
- IA : Mistral API (obligatoire)
- Stockage : fichiers JSON locaux

## 10. Évaluation (à définir ensemble)
### Grille de qualité proposée (v1)
- Pertinence : l’explication correspond-elle à la position et au plan ?
- Clarté : vocabulaire compréhensible (public 1600–2200)
- Pédagogie : questions/indices avant la réponse
- Actionnabilité : l’utilisateur sait quoi travailler / quoi regarder

### Mesures simples
- Note utilisateur (1–5) “utile / pas utile” par session
- Taux de “solution demandée” (proxy de dépendance)

## 11. Epics (proposition)
- Epic 1 : Application Electron POC (UI + affichage position)
- Epic 2 : Intégration Mistral API (prompts, formats de réponse, erreurs)
- Epic 3 : Parcours pédagogique en 4 phases
- Epic 4 : Historique local + défis
- Epic 5 (option) : Intégration Stockfish (si simple)
