-- Script de nettoyage et recréation
-- Utilisez ce script si vous avez eu l'erreur "column statut does not exist"

-- 1. Supprimer les tables existantes (si la migration a partiellement échoué)
DROP TABLE IF EXISTS rapports CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP VIEW IF EXISTS client_stats CASCADE;

-- 2. Supprimer les fonctions
DROP FUNCTION IF EXISTS update_updated_at_column();

-- 3. Créer la table clients
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  email text,
  prenom text,
  secteur text,
  mots_cles text[] DEFAULT '{}',
  concurrents text[] DEFAULT '{}',
  profiles_linkedin text[] DEFAULT '{}',
  sources_veille text[] DEFAULT '{}',
  frequence text,
  heure_envoi text,
  canaux_diffusion text[] DEFAULT '{}',
  alertes_temps_reel boolean DEFAULT false,
  status_onboarding text DEFAULT 'next_step',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Créer la table rapports
CREATE TABLE rapports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  titre text NOT NULL,
  contenu text,
  type text,
  statut text DEFAULT 'genere',
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

-- 5. Ajouter les contraintes après création
ALTER TABLE rapports
  ADD CONSTRAINT rapports_type_check
  CHECK (type IN ('quotidien', 'hebdomadaire', 'mensuel'));

ALTER TABLE rapports
  ADD CONSTRAINT rapports_statut_check
  CHECK (statut IN ('genere', 'envoye'));

-- 6. Créer les indexes
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_updated_at ON clients(updated_at DESC);
CREATE INDEX idx_rapports_client_id ON rapports(client_id);
CREATE INDEX idx_rapports_created_at ON rapports(created_at DESC);
CREATE INDEX idx_rapports_statut ON rapports(statut);

-- 7. Activer RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapports ENABLE ROW LEVEL SECURITY;

-- 8. Policies pour clients
CREATE POLICY "Service role can manage all clients"
  ON clients
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

-- 9. Policies pour rapports
CREATE POLICY "Service role can manage all rapports"
  ON rapports
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view all rapports"
  ON rapports FOR SELECT
  TO authenticated
  USING (true);

-- 10. Fonction auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. Trigger sur clients
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 12. Vue statistiques
CREATE OR REPLACE VIEW client_stats AS
SELECT
  c.id,
  c.user_id,
  c.email,
  c.prenom,
  c.secteur,
  c.status_onboarding,
  COUNT(r.id) as nb_rapports_generes,
  COUNT(r.id) FILTER (WHERE r.statut = 'envoye') as nb_rapports_envoyes,
  MAX(r.created_at) as dernier_rapport_date
FROM clients c
LEFT JOIN rapports r ON c.id = r.client_id
GROUP BY c.id, c.user_id, c.email, c.prenom, c.secteur, c.status_onboarding;

-- 13. Vérification
SELECT 'Migration terminée avec succès !' as status;
SELECT 'Table clients créée avec ' || COUNT(*) || ' colonnes' as info FROM information_schema.columns WHERE table_name = 'clients';
SELECT 'Table rapports créée avec ' || COUNT(*) || ' colonnes' as info FROM information_schema.columns WHERE table_name = 'rapports';
