-- ============================================================
-- VÉRIFIER LA STRUCTURE DE LA TABLE RAPPORTS
-- ============================================================

-- 1. Voir toutes les colonnes de la table rapports
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'rapports'
ORDER BY ordinal_position;

-- 2. Voir un exemple de rapport (première ligne)
SELECT * FROM rapports LIMIT 1;

-- 3. Voir les noms de colonnes liées à la date
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'rapports'
  AND column_name LIKE '%date%';
