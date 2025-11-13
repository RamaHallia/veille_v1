-- =================================================================
-- TRIGGER : Indexation Automatique des Rapports
-- =================================================================
-- Créé le : 13 novembre 2025
-- Objectif : Appeler automatiquement l'Edge Function index-rapport
--            dès qu'un nouveau rapport est créé
-- =================================================================

-- 1. Activer l'extension pg_net (pour faire des requêtes HTTP)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Créer la fonction qui appelle l'Edge Function
CREATE OR REPLACE FUNCTION auto_index_rapport_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  edge_function_url TEXT;
BEGIN
  -- Récupérer l'URL Supabase depuis les variables d'environnement
  -- À REMPLACER avec votre vraie URL Supabase
  supabase_url := 'https://VOTRE_PROJECT_ID.supabase.co';

  -- À REMPLACER avec votre vraie clé Service Role
  -- (Dans Supabase Dashboard → Settings → API → service_role key)
  service_role_key := 'VOTRE_SERVICE_ROLE_KEY';

  -- Construire l'URL de l'Edge Function
  edge_function_url := supabase_url || '/functions/v1/index-rapport';

  -- Logger l'appel (visible dans les logs PostgreSQL)
  RAISE LOG '🚀 Auto-indexation déclenchée pour rapport_id: %', NEW.id;

  -- Appeler l'Edge Function en arrière-plan via pg_net
  PERFORM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'rapport_id', NEW.id::text
    ),
    timeout_milliseconds := 60000
  );

  RAISE LOG '✅ Requête HTTP envoyée pour indexation du rapport %', NEW.id;

  RETURN NEW;
END;
$$;

-- 3. Créer le trigger sur INSERT (nouveau rapport)
DROP TRIGGER IF EXISTS trigger_auto_index_new_rapport ON rapports;

CREATE TRIGGER trigger_auto_index_new_rapport
AFTER INSERT ON rapports
FOR EACH ROW
WHEN (
  -- Seulement si le rapport a du contenu à indexer
  NEW.contenu_html IS NOT NULL OR NEW.resume IS NOT NULL
)
EXECUTE FUNCTION auto_index_rapport_trigger();

-- 4. Créer le trigger sur UPDATE (contenu modifié)
DROP TRIGGER IF EXISTS trigger_auto_reindex_rapport ON rapports;

CREATE TRIGGER trigger_auto_reindex_rapport
AFTER UPDATE ON rapports
FOR EACH ROW
WHEN (
  -- Seulement si le contenu a changé
  (NEW.contenu_html IS DISTINCT FROM OLD.contenu_html OR
   NEW.resume IS DISTINCT FROM OLD.resume) AND
  (NEW.contenu_html IS NOT NULL OR NEW.resume IS NOT NULL)
)
EXECUTE FUNCTION auto_index_rapport_trigger();

-- =================================================================
-- COMMENTAIRES
-- =================================================================

COMMENT ON FUNCTION auto_index_rapport_trigger() IS
  'Fonction trigger qui appelle automatiquement l''Edge Function index-rapport dès qu''un rapport est créé ou modifié';

COMMENT ON TRIGGER trigger_auto_index_new_rapport ON rapports IS
  'Déclenche l''indexation automatique quand un nouveau rapport est inséré';

COMMENT ON TRIGGER trigger_auto_reindex_rapport ON rapports IS
  'Déclenche la ré-indexation automatique quand le contenu d''un rapport est modifié';

-- =================================================================
-- ✅ FIN DU SCRIPT
-- =================================================================

-- IMPORTANT : N'oubliez pas de REMPLACER dans la fonction :
-- 1. 'https://VOTRE_PROJECT_ID.supabase.co' avec votre vraie URL
-- 2. 'VOTRE_SERVICE_ROLE_KEY' avec votre vraie clé service_role

-- Pour tester :
-- INSERT INTO rapports (client_id, titre, contenu_html)
-- VALUES ('client-uuid', 'Test', '<p>Contenu de test</p>');

-- Pour vérifier les logs :
-- SELECT * FROM pg_stat_statements WHERE query LIKE '%auto_index%';
