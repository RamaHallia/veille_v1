-- Migration: Ajouter les destinataires et CC pour les emails
-- Date: 2025-11-06

-- Ajouter colonnes pour les destinataires emails
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS email_destinataires text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS email_cc text[] DEFAULT '{}';

-- Commentaires
COMMENT ON COLUMN clients.email_destinataires IS 'Liste des emails destinataires principaux pour les rapports';
COMMENT ON COLUMN clients.email_cc IS 'Liste des emails en copie (CC) pour les rapports';
