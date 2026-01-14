# Source Tree

## Fichiers de référence pour les agents

- **`app/main.js`** : Processus principal Electron (IPC, appels Mistral)
- **`app/preload.js`** : Pont sécurisé (contextBridge)
- **`app/renderer/`** : UI (HTML, CSS, JS)
  - `renderer.js` : parsing/validation FEN, affichage échiquier, appels Mistral via IPC
  - `styles.css` : styles purs ; pas de préprocesseur

## À utiliser par les agents

- **Dev (`@dev`)** : toujours charger `docs/architecture/coding-standards.md`, `tech-stack.md`, `source-tree.md`
- **SM (`@sm`)** : lire `docs/prd/` et `docs/architecture/` pour générer des stories dans `docs/stories/`
