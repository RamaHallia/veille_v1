-- ========================================
-- VÉRIFIER ET CORRIGER LE RLS SUR RAPPORTS
-- ========================================

-- 1. Vérifier si RLS est activé sur la table rapports
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'rapports';
-- Si rowsecurity = true, alors RLS est activé

-- 2. Voir toutes les politiques sur rapports
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'rapports';

-- 3. DÉSACTIVER LE RLS sur rapports (solution temporaire)
ALTER TABLE rapports DISABLE ROW LEVEL SECURITY;

-- 4. VÉRIFIER les données
-- Remplacez 'VOTRE_CLIENT_ID' par votre client_id
SELECT
  id,
  client_id,
  titre,
  date_generation,
  nb_sources
FROM rapports
WHERE client_id = '6ff0eaa4-c687-4188-b2e4-a554eeb9a323'
ORDER BY date_generation DESC;

-- 5. TEST DIRECT depuis Supabase
-- Simuler la requête exacte que fait le frontend
SELECT *
FROM rapports
WHERE client_id = '6ff0eaa4-c687-4188-b2e4-a554eeb9a323'
ORDER BY date_generation DESC;

-- ========================================
-- Si vous voulez réactiver RLS plus tard avec la bonne politique:
-- ========================================

-- OPTION 1: RLS permissif (tous les utilisateurs authentifiés peuvent lire)
/*
ALTER TABLE rapports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all rapports"
ON rapports
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert rapports"
ON rapports
FOR INSERT
TO authenticated
WITH CHECK (true);
*/

-- OPTION 2: RLS strict (chaque utilisateur voit uniquement ses rapports)
/*
ALTER TABLE rapports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rapports"
ON rapports
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()::text
  )
);

CREATE POLICY "Service can insert rapports"
ON rapports
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own rapports"
ON rapports
FOR UPDATE
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()::text
  )
);
*/
