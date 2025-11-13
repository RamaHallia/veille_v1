-- ============================================================
-- TESTER LE TRIGGER AUTO-INDEXATION
-- ============================================================

-- ⚠️ AVANT D'EXÉCUTER :
-- Remplacez UUID_CLIENT par un vrai client_id de votre table clients

-- 1. Insérer un rapport de test
INSERT INTO rapports (client_id, titre, contenu, date_generation, type, statut)
VALUES (
  'VOTRE_CLIENT_ID_ICI',  -- ⚠️ À REMPLACER
  'Test Auto-Indexation Trigger',
  'Ceci est un test pour vérifier que le trigger PostgreSQL fonctionne correctement et indexe automatiquement les nouveaux rapports.',
  NOW(),
  'quotidien',
  'envoye'
)
RETURNING id, titre, created_at;

-- 2. Après quelques secondes (le trigger est asynchrone), vérifier l'indexation
-- Remplacez RAPPORT_ID_RETOURNÉ par l'ID retourné ci-dessus
SELECT
  COUNT(*) as nombre_chunks_crees,
  MIN(created_at) as premiere_indexation
FROM rapport_chunks
WHERE rapport_id = 'RAPPORT_ID_RETOURNÉ';  -- ⚠️ À REMPLACER

-- Si nombre_chunks_crees > 0, le trigger fonctionne ! ✅
