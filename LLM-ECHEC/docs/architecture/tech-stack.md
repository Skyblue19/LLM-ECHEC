# Tech Stack

## Tableau

| Category | Technology | Version | Purpose | Rationale |
|---|---|---|---|---|
| Frontend Language | HTML/CSS/JS (vanilla) | UI simple et rapide pour POC | Pas de framework lourd ; compatibilité maximale avec Mistral |
| Frontend Framework | Electron | 29.0+ | Runtime desktop | Encapsule UI + IPC ; déjà utilisé |
| UI Components | Aucune librairie | - | Composants DOM purs ; pas besoin de React/Vue pour POC |
| State Management | Aucun | - | Pas d’état global côté UI pour POC |
| Backend Language | JavaScript (Node.js) | Intégration Mistral + IPC | Natif à Electron ; pas de serveur |
| Backend Framework | Aucun | - | Pas de framework serveur ; logique dans main.js |
| API Style | HTTP direct (fetch) | Appels Mistral depuis main | Simple, pas de GraphQL/REST complexe |
| Database | Aucun | - | Pas de base de données pour POC |
| Cache | Aucun | - | Pas de cache côté client/serveur |
| File Storage | Fichiers JSON locaux | Historique sessions | Simple, local, RGPD-friendly |
| Authentication | Clé API dans env | `MISTRAL_API_KEY` | Pas de stockage de secret |
| Frontend Testing | Aucun | - | Pas de tests automatisés requis pour POC |
| Backend Testing | Aucun | - | Pas de tests backend requis pour POC |
| E2E Testing | Aucun | - | Pas de tests E2E requis pour POC |
| Build Tool | Electron | - | Lance l’application |
| IaC Tool | Aucun | - | Pas d’IaC requis pour POC |
| CI/CD | Aucun | - | Pas de pipeline CI/CD pour POC |
| Monitoring | Aucun | - | Pas de monitoring requis pour POC |
| Logging | Console | - | Logs console et erreurs IPC |
| CSS Framework | Aucun | - | Styles purs ; pas de préprocesseur |
| Bundler | Aucun | - | Pas de bundler ; fichiers servis tels quels |

## Notes

- **Stack minimaliste** pour respecter les contraintes POC (pas de dépendances inutiles).
- **Évolutivité** : on peut ajouter React/Vue plus tard sans casser l’architecture existante.
