-- ============================================================
-- VÉRIFIER QUE LE TRIGGER EST BIEN CRÉÉ
-- ============================================================
-- Exécutez cette requête SEULE dans un nouveau SQL query

SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name,
  tgenabled as enabled
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgname = 'trigger_auto_index_rapport';
