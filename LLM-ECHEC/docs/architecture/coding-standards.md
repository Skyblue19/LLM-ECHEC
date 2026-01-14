# Coding Standards

## Règles critiques (POC)

- **Pas de framework front lourd** : utiliser HTML/CSS/JS purs.
- **Pas de dépendances externes** : éviter `npm install` de librairies non indispensables.
- **Pas de build complexe** : pas de Webpack/Vite ; fichiers servis directement.
- **Sécurité** : jamais exposer `MISTRAL_API_KEY` dans le code ; utiliser `process.env`.
- **IPC** : utiliser `contextBridge` avec `contextIsolation: true`.
- **Erreurs** : retour IPC clair ; logs console ; messages utilisateur en français.
- **Fichiers locaux** : stocker dans `app/data/` ou `app/sessions/` (JSON).

## Interdits

- Ne jamais stocker de clé ou secret dans un fichier.
- Ne jamais faire `require` de variables d’environnement directement dans le renderer.
- Ne jamais désactiver `contextIsolation`.

## Conseils

- Garder les composants petits (une fonction par fichier si possible).
- Privilégier la lisibilité pour les agents BMad (`@dev`, `@sm`).
- Utiliser des noms de fichiers explicites (ex: `fen-validator.js`, `mistral-service.js`).

## Outils (optionnels)

Si plus tard :
- ESLint + Prettier pour le formattage
- Tests unitaires simples (Jest ou Mocha)
- Scripts `npm run` pour les tâches récurrentes
