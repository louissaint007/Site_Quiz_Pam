---
description: Advanced debugging workflow (Auto-Correction) for deep analysis and fixing.
---

# Deep-Debug-Fix

Ce workflow intervient dès qu'une erreur est détectée pour localiser, comprendre et réparer le code.

## Étapes du Workflow

1. **Analyse des Logs**
   - Analyser la stack trace ou le journal d'erreurs fourni (ex: celui du Workflow de Validation).
   - Extraire les messages d'erreur et les codes d'état.

2. **Localisation du Problème**
   - Identifier précisément le fichier et le numéro de ligne responsable de l'erreur.

3. **Analyse de Contexte**
   - Lire les fichiers dépendants et les imports pour comprendre l'environnement global de la fonction en faute.
   - Vérifier les types, les variables d'environnement et les appels API liés.

4. **Proposition de Solutions**
   - Proposer 3 solutions de correction distinctes (ex: patch rapide, refont sécurisée, correction de config).
   - Analyser les impacts potentiels de chaque solution.

// turbo
5. **Application et Vérification**
   - Appliquer la solution la plus stable après avoir validé la syntaxe.
   - Relancer le test spécifique qui a échoué pour confirmer que le patch fonctionne sans régression.
