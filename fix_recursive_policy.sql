-- Supprimer la politique qui a causé la récursion infinie
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Remplacer par une politique simple qui permet à tout utilisateur authentifié de voir les profils
-- (nécessaire de toute façon pour voir les classements et autres joueurs)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (auth.role() = 'authenticated');

-- Rafraîchir le cache du schéma pour corriger l'erreur "last_level_notified"
NOTIFY pgrst, reload_schema;
