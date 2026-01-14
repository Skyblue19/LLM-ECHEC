# LLM Échec — Fullstack Architecture Document

## Introduction

Ce document définit une architecture **simple et pragmatique** pour le POC "LLM Échec" (EIAH d’apprentissage des échecs), afin de guider les développements dans l’IDE avec des agents (BMad). L’objectif est de conserver une architecture locale, lisible et facile à itérer, compatible avec Electron/Node.js et l’intégration d’un LLM via l’API Mistral.

L’architecture est organisée autour de deux préoccupations principales :

- **Expérience d’apprentissage** : saisie d’une position (FEN), affichage, progression en phases, retours pédagogiques.
- **Services techniques** : parsing/validation FEN, orchestration du flux Electron (main ↔ renderer), appel Mistral, stockage local JSON.

Le document sert de "single source of truth" pour :

- Le découpage des composants (renderer, main process, services)
- Les interfaces entre couches (IPC, services)
- Le stockage local (JSON)
- Les contraintes de sécurité (pas de secret dans le repo, `contextIsolation` activé)

### Starter Template or Existing Project

**N/A — Greenfield POC.**

Nous avons déjà un squelette Electron minimal dans `app/` (main process + renderer HTML/CSS/JS) :

- UI: champ FEN, rendu échiquier, bouton "Analyser (Mistral)"
- IPC sécurisé via preload (context bridge)
- Main process gère les appels réseau Mistral (et renvoie un message clair si `MISTRAL_API_KEY` est manquante)

Ce squelette est conservé comme base pour le POC (pas de framework front lourd pour l’instant).

### Change Log

| Date | Version | Description | Author |
|---|---:|---|---|
| 2026-01-13 | 0.1 | Création initiale du document (POC Electron + Mistral) | Winston (Architect) |
