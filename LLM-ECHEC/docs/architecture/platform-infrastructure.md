# Platform and Infrastructure Choice

## Recommandation POC

**Plateforme : Locale (Desktop Electron)**

### Rationale
- **Simplicité** : pas de serveur à gérer, pas de déploiement cloud.
- **Contrôle total** : le code s’exécute localement ; idéal pour un POC pédagogique.
- **Compatibilité Mistral** : appels directs depuis Node.js (pas de CORS/serveur intermédiaire).
- **Stockage local** : JSON fichiers ; pas de base de données ; compatible RGPD.

### Services Clés

- **Runtime** : Electron (Node.js)
- **Stockage** : fichiers JSON locaux (`app/data/` ou `app/sessions/`)
- **Réseau** : appels directs API Mistral (pas de proxy/serveur)

### Alternatives écartées

- **Web (Vercel, AWS, Azure)** : complexe, inutile pour un POC local.
- **Backend server (Express/Fastify)** : surcharge pour un simple tuteur échecs.
- **Base de données (Supabase, MongoDB)** : non requis pour le POC.

## Décision

- **Plateforme retenue** : **Locale (Electron)**
- **Services à utiliser** : Mistral API (direct) + fichiers JSON locaux.
