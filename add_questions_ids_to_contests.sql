-- Ajouter la colonne questions_ids à la table contests si elle n'existe pas
ALTER TABLE contests ADD COLUMN IF NOT EXISTS questions_ids UUID[];
