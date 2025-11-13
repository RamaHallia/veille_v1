/*
  # Schema pour l'Onboarding et la Veille Concurrentielle

  1. New Tables
    - `clients`
      - `id` (uuid, primary key)
      - `user_id` (text) - ID externe du chatbot
      - `email` (text)
      - `prenom` (text)
      - `secteur` (text)
      - `mots_cles` (text[]) - Array de mots-clés (3-5)
      - `concurrents` (text[]) - Array de concurrents (3-10)
      - `profiles_linkedin` (text[]) - Array d'URLs LinkedIn
      - `sources_veille` (text[]) - Array d'URLs de flux RSS
      - `frequence` (text) - quotidienne/hebdomadaire/mensuelle
      - `heure_envoi` (text)
      - `canaux_diffusion` (text[]) - Array: Mail, Slack, WhatsApp
      - `alertes_temps_reel` (boolean)
      - `status_onboarding` (text) - next_step/done/etc.
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `rapports`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to clients)
      - `titre` (text)
      - `contenu` (text)
      - `type` (text) - quotidien/hebdomadaire/mensuel
      - `statut` (text) - generé/envoyé
      - `created_at` (timestamptz)
      - `sent_at` (timestamptz)

  2. Security
    - Enable RLS on clients table
    - Allow read/write access for authenticated users
    - Service role can access all data (for n8n)
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
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

-- Create rapports table
CREATE TABLE IF NOT EXISTS rapports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  titre text NOT NULL,
  contenu text,
  type text CHECK (type IN ('quotidien', 'hebdomadaire', 'mensuel')),
  statut text DEFAULT 'genere' CHECK (statut IN ('genere', 'envoye')),
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_updated_at ON clients(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_rapports_client_id ON rapports(client_id);
CREATE INDEX IF NOT EXISTS idx_rapports_created_at ON rapports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rapports_statut ON rapports(statut);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapports ENABLE ROW LEVEL SECURITY;

-- Clients policies (allow service role full access for n8n)
CREATE POLICY "Service role can manage all clients"
  ON clients
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

-- Rapports policies
CREATE POLICY "Service role can manage all rapports"
  ON rapports
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view all rapports"
  ON rapports FOR SELECT
  TO authenticated
  USING (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on clients table
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create view for client statistics
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
