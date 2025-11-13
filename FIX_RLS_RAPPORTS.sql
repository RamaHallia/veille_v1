-- ========================================
-- FIX : Politiques RLS pour la table rapports
-- Permet à chaque utilisateur de voir UNIQUEMENT ses propres rapports
-- ========================================

-- 1. Activer RLS sur la table rapports
ALTER TABLE rapports ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer toutes les anciennes politiques
DROP POLICY IF EXISTS "Users can view their own rapports" ON rapports;
DROP POLICY IF EXISTS "Users can insert their own rapports" ON rapports;
DROP POLICY IF EXISTS "Users can update their own rapports" ON rapports;
DROP POLICY IF EXISTS "Users can delete their own rapports" ON rapports;
DROP POLICY IF EXISTS "Enable read access for all users" ON rapports;

-- 3. Créer la politique SELECT (lecture)
-- Un utilisateur peut lire les rapports dont le client_id correspond à SON client
CREATE POLICY "Users can view their own rapports"
ON rapports
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()::text
  )
);

-- 4. Créer la politique INSERT (création)
-- Un utilisateur/service peut créer des rapports pour n'importe quel client
-- (Utilisé par n8n pour générer les rapports)
CREATE POLICY "Authenticated users can insert rapports"
ON rapports
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Créer la politique UPDATE (modification)
-- Un utilisateur peut modifier les rapports de son client
CREATE POLICY "Users can update their own rapports"
ON rapports
FOR UPDATE
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()::text
  )
)
WITH CHECK (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()::text
  )
);

-- 6. Créer la politique DELETE (suppression)
-- Un utilisateur peut supprimer les rapports de son client
CREATE POLICY "Users can delete their own rapports"
ON rapports
FOR DELETE
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()::text
  )
);

-- ========================================
-- VÉRIFICATION
-- ========================================

-- Voir toutes les politiques créées
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

-- ========================================
-- TEST
-- ========================================

-- Tester en tant qu'utilisateur authentifié
-- Remplacez '5fa9d9df-2008-4fcd-9f05-0aaed9a1e68e' par votre user_id

-- 1. Voir votre client_id
SELECT id, user_id, prenom
FROM clients
WHERE user_id = '5fa9d9df-2008-4fcd-9f05-0aaed9a1e68e';

-- 2. Voir les rapports de votre client
SELECT
  r.id,
  r.titre,
  r.date_generation,
  r.client_id,
  c.prenom as client_prenom
FROM rapports r
JOIN clients c ON c.id = r.client_id
WHERE c.user_id = '5fa9d9df-2008-4fcd-9f05-0aaed9a1e68e'
ORDER BY r.date_generation DESC;
