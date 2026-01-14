# High Level Architecture

## Overview

Architecture **simple et locale** pour le POC "LLM Échec" : une application Electron qui combine une interface utilisateur (FEN + échiquier) avec un tuteur IA (Mistral). L’objectif est de faciliter l’apprentissage des échecs pour des joueurs intermédiaires (Elo 1600–2200) via des explications en langage naturel.

## Architectural Style

- **Single Process Architecture** : Electron encapsule UI (renderer) et backend (main) dans un même binaire.
- **Event-Driven IPC** : communication sécurisée entre renderer et main via preload (contextBridge).
- **Local-First Storage** : fichiers JSON locaux pour l’historique des sessions ; pas de base de données externe.
- **API-Out** : appels directs vers Mistral depuis le main process (pas de serveur backend).

## Key Integration Points

- **UI → Main** : bouton “Analyser (Mistral)” → IPC → main → API Mistral → retour IPC → UI.
- **FEN ↔ Board** : parsing/validation FEN côté renderer ; affichage en Unicode.
- **Historique** : stockage local JSON (sessions, thèmes, erreurs récurrentes).

## Alignment with PRD Goals

- **Expérience pédagogique** : UI en 4 phases (Découverte → Analyse → Feedback → Progression) orchestrée par l’IA.
- **Simplicité POC** : pas de scalabilité, pas de multi-utilisateurs, pas de backend complexe.
- **RGPD** : pas de données personnelles ; clé API via variable d’environnement ; stockage local.

## Non-Goals (Out of Scope for POC)

- Pas de web backend, pas de SaaS, pas de multi-comptes.
- Pas de base de données centralisée.
- Pas de déploiement cloud.
