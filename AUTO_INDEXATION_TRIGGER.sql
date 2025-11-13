-- ============================================================
-- AUTO-INDEXATION COMPLÈTE AVEC TRIGGER POSTGRESQL
-- ============================================================

-- 1. Activer l'extension pg_net (pour faire des requêtes HTTP)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Fonction pour appeler l'Edge Function d'indexation
CREATE OR REPLACE FUNCTION auto_index_rapport()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id BIGINT;
BEGIN
  -- Appeler l'Edge Function index-rapport avec le nouveau rapport_id
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/index-rapport',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object('rapport_id', NEW.id)
  ) INTO request_id;

  -- Logger l'action
  RAISE NOTICE 'Indexation déclenchée pour rapport % (request_id: %)', NEW.id, request_id;

  RETURN NEW;
END;
$$;

-- 3. Créer le trigger qui s'exécute après chaque INSERT dans rapports
DROP TRIGGER IF EXISTS trigger_auto_index_rapport ON rapports;

CREATE TRIGGER trigger_auto_index_rapport
  AFTER INSERT ON rapports
  FOR EACH ROW
  EXECUTE FUNCTION auto_index_rapport();

-- ============================================================
-- VÉRIFICATIONS
-- ============================================================

-- Vérifier que le trigger existe
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_index_rapport';

-- Tester le trigger (à faire APRÈS avoir remplacé YOUR_PROJECT_REF et YOUR_SERVICE_KEY)
-- INSERT INTO rapports (client_id, titre, contenu, date_rapport, type, statut)
-- VALUES (
--   'UUID_CLIENT',
--   'Test Auto-Indexation',
--   'Ceci est un test pour vérifier que le trigger fonctionne.',
--   NOW(),
--   'quotidien',
--   'envoye'
-- );

-- Vérifier que le rapport a été indexé
-- SELECT COUNT(*) FROM rapport_chunks WHERE rapport_id = 'UUID_DU_RAPPORT_TEST';

-- ============================================================
-- NOTES IMPORTANTES
-- ============================================================

-- ⚠️ À REMPLACER :
-- 1. YOUR_PROJECT_REF → Ton ref Supabase (ex: xottryrwoxafervpovex)
-- 2. YOUR_SUPABASE_SERVICE_ROLE_KEY → Ta clé service_role

-- ✅ Ce trigger s'exécute automatiquement pour CHAQUE nouveau rapport créé
-- ✅ Pas besoin de n8n
-- ✅ Pas besoin de bouton manuel
-- ✅ Fonctionne même si l'app frontend n'est pas ouverte

-- 🔍 Pour voir les logs du trigger :
-- SELECT * FROM pg_stat_statements;

-- 🗑️ Pour désactiver le trigger (si besoin) :
-- DROP TRIGGER IF EXISTS trigger_auto_index_rapport ON rapports;
