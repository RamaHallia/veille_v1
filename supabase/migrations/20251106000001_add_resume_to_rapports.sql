-- Migration: Ajouter colonne resume pour stocker les résumés générés par IA
-- Date: 2025-11-06

-- Ajouter la colonne resume
ALTER TABLE rapports
ADD COLUMN IF NOT EXISTS resume text NULL;

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_rapports_resume ON rapports USING gin(to_tsvector('french', resume));

-- Commentaire
COMMENT ON COLUMN rapports.resume IS 'Résumé généré automatiquement par IA (GPT-4) du contenu du rapport';
