# Repository Structure

## Structure

**Monorepo : Non**  
POC = une seule application Electron dans `app/`.

```
LLM ECHEC BMAD/
├── app/                     # Application Electron (POC)
│   ├── main.js            # Processus principal (IPC, appels Mistral)
│   ├── preload.js          # Pont sécurisé renderer ↔ main
│   ├── package.json         # Dépendances (Electron)
│   └── renderer/           # Interface utilisateur
│       ├── index.html      # Page principale
│       ├── styles.css       # Styles
│       └── renderer.js      # Logique UI, parsing FEN, appels Mistral
├── docs/                    # Documents BMad
│   ├── prd/               # PRD shardé
│   │   ├── index.md
│   │   └── *.md
│   ├── architecture/        # Architecture shardée (ce fichier)
│   │   ├── index.md
│   │   └── *.md
│   └── stories/            # Stories créées par SM (plus tard)
├── .bmad-core/             # Framework BMad (agents, tâches, templates)
└── .windsurf/workflows/    # Workflows IDE (@pm, @architect, @dev, etc.)
```

## Rationale

- **`app/`** contient tout le code exécutable (UI + IPC + appels Mistral).
- **`docs/`** contient les documents de référence pour les agents BMad.
- **Pas de backend séparé** : tout est dans le même processus Electron.
- **Pas de monorepo** : inutile pour un POC ; évite la complexité.

## Conventions pour les agents

- **Dev agents** (`@dev`) chargent toujours les fichiers listés dans `.bmad-core/core-config.yaml` (ex: `docs/architecture/coding-standards.md`).
- **SM** utilise `docs/prd/` et `docs/architecture/` pour générer des stories dans `docs/stories/`.
