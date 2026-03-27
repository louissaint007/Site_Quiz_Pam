---
description: MCP synchronization workflow to manage health and connectivity of external servers.
---

# MCP-Bridge-Sync

Ce workflow gère la "santé" de vos connexions serveurs MCP (Filesystem, Supabase, Printful, etc.).

## Étapes du Workflow

1. **Vérification de Connexion**
   - Tester l'état de réponse de tous les serveurs MCP configurés (`supabase-mcp-server`, `printful-mcp`).
   - Lister les serveurs actifs et inactifs.

2. **Test des Permissions**
   - Vérifier les droits de lecture et d'écriture sur le `Filesystem` ciblé par le projet.
   - Confirmer l'accès aux répertoires de build et d'artifacts.

3. **Audit des Clés API**
   - S'assurer que les clés API nécessaires (Supabase, Printful, etc.) sont chargées dans les variables d'environnement.
   - Vérifier que les clés ne sont pas expirées ou révoquées.

// turbo
4. **Action Corrective**
   - En cas de déconnexion : Tenter une reconnexion automatique.
   - Si l'échec persiste : Fournir la commande shell spécifique pour redémarrer le serveur MCP concerné (ex: relancer la configuration MCP).
