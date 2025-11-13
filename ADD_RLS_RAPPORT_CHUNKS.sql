-- ============================================================
-- AJOUTER LES POLITIQUES RLS POUR rapport_chunks
-- ============================================================

-- 1. Activer RLS sur rapport_chunks
ALTER TABLE rapport_chunks ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can read their own chunks" ON rapport_chunks;
DROP POLICY IF EXISTS "Service can insert chunks" ON rapport_chunks;
DROP POLICY IF EXISTS "Service can delete chunks" ON rapport_chunks;

-- 3. Politique SELECT (lecture) - Utilisateurs authentifiés
-- Permet aux utilisateurs de lire les chunks de leurs rapports
CREATE POLICY "Users can read their own chunks"
ON rapport_chunks
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()::text
  )
);

-- 4. Politique INSERT (création) - Service role et authenticated
-- L'Edge Function doit pouvoir insérer des chunks
CREATE POLICY "Service can insert chunks"
ON rapport_chunks
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Politique DELETE (suppression) - Pour nettoyer si besoin
CREATE POLICY "Service can delete chunks"
ON rapport_chunks
FOR DELETE
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()::text
  )
);

-- ============================================================
-- VÉRIFICATION
-- ============================================================

-- Voir toutes les politiques sur rapport_chunks
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'rapport_chunks';
