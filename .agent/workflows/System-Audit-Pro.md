---
description: Functional validation workflow (Reality Test) to audit implemented features.
---

# System-Audit-Pro

Ce workflow agit comme un "Contrôleur Qualité". Il parcourt la liste des fonctionnalités et vérifie leur état de marche réel.

## Étapes du Workflow

1. **Scan du Répertoire**
   - Lister les fichiers clés, les endpoints API et les composants UI du projet.
   - Identifier les fonctionnalités implémentées (ex: Authentification, Dashboard, Widgets).

2. **Génération de Tests**
   - Créer une suite de tests unitaires et d'intégration temporaires pour chaque fonctionnalité détectée.
   - Stocker ces tests dans un répertoire temporaire (ex: `/tmp/audit_tests/`).

// turbo
3. **Exécution des Tests**
   - Lancer les tests via le terminal selon l'environnement :
     - `npm test` (JavaScript/TypeScript)
     - `pytest` (Python)
     - `gradle test` (Android/Java)

4. **Analyse des Résultats**
   - Capturer les sorties standard et d'erreurs.
   - Générer un rapport `Success/Fail` détaillé listant chaque fonctionnalité testée.

5. **Transition Automatique**
   - Si un échec (`Fail`) est détecté : Passer automatiquement le contexte au workflow `/Deep-Debug-Fix` pour correction.
   - Si tout est `Success` : Valider la santé globale du système.
