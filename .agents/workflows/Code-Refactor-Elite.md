---
description: Performance optimization workflow (Refactoring) for clean and efficient code.
---

# Code-Refactor-Elite

Ce workflow vise à rendre le code plus propre, plus rapide et mieux documenté une fois fonctionnel.

## Étapes du Workflow

1. **Analyse de Complexité**
   - Mesurer la complexité cyclomatique des fonctions principales.
   - Identifier les fonctions trop longues ou trop imbriquées.

2. **Détection de Duplication (DRY)**
   - Scanner le code pour identifier les blocs répétitifs ou similaires.
   - Proposer une factorisation dans des utilitaires ou des composants réutilisables.

3. **Optimisation de Performance**
   - Identifier les goulots d'étranglement potentiels (boucles inefficaces, requêtes redondantes).
   - Proposer des optimisations pour réduire le temps d'exécution ou la consommation mémoire.

4. **Mise à jour de la Documentation**
   - Mettre à jour ou générer les commentaires JSDoc (JS/TS), Docstrings (Python) ou Javadoc (Java).
   - S'assurer que la documentation reflète précisément les changements structurels effectués.

5. **Validation Finale**
   - Lancer un build de vérification ou un test global pour s'assurer que le refactoring n'a pas introduit d'effets de bord.
