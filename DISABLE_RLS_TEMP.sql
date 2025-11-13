-- ============================================================
-- DÉSACTIVER TEMPORAIREMENT RLS POUR TESTER AUTO-INDEXER
-- ============================================================
-- ⚠️ À UTILISER UNIQUEMENT EN DÉVELOPPEMENT
-- ⚠️ NE PAS UTILISER EN PRODUCTION

-- Désactiver RLS sur rapports
ALTER TABLE rapports DISABLE ROW LEVEL SECURITY;

-- Désactiver RLS sur rapport_chunks
ALTER TABLE rapport_chunks DISABLE ROW LEVEL SECURITY;

-- Vérifier que RLS est désactivé
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('rapports', 'rapport_chunks');

-- Résultat attendu : rowsecurity = false pour les deux tables

-- ============================================================
-- POUR RÉACTIVER PLUS TARD (IMPORTANT!)
-- ============================================================
-- Une fois le test terminé, exécutez ces commandes :

-- ALTER TABLE rapports ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE rapport_chunks ENABLE ROW LEVEL SECURITY;
