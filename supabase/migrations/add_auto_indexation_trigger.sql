-- Migration : Indexation automatique des rapports
-- Créé le : 13 novembre 2025
-- Objectif : Indexer automatiquement chaque nouveau rapport via trigger

-- 1. Créer la fonction qui appelle l'Edge Function
CREATE OR REPLACE FUNCTION auto_index_rapport()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Récupérer l'URL de l'Edge Function
  function_url := current_setting('app.supabase_url', true) || '/functions/v1/index-rapport';
  service_role_key := current_setting('app.supabase_service_role_key', true);

  -- Appeler l'Edge Function en arrière-plan (via pg_net)
  -- Note: pg_net.http_post est asynchrone, n'attend pas la réponse
  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'rapport_id', NEW.id
      )
    );

  RETURN NEW;
END;
$$;

-- 2. Créer le trigger sur INSERT
DROP TRIGGER IF EXISTS trigger_auto_index_rapport ON rapports;

CREATE TRIGGER trigger_auto_index_rapport
AFTER INSERT ON rapports
FOR EACH ROW
WHEN (NEW.contenu_html IS NOT NULL OR NEW.resume IS NOT NULL)
EXECUTE FUNCTION auto_index_rapport();

-- 3. Créer le trigger sur UPDATE (si le contenu change)
DROP TRIGGER IF EXISTS trigger_auto_reindex_rapport ON rapports;

CREATE TRIGGER trigger_auto_reindex_rapport
AFTER UPDATE ON rapports
FOR EACH ROW
WHEN (
  (NEW.contenu_html IS DISTINCT FROM OLD.contenu_html OR
   NEW.resume IS DISTINCT FROM OLD.resume) AND
  (NEW.contenu_html IS NOT NULL OR NEW.resume IS NOT NULL)
)
EXECUTE FUNCTION auto_index_rapport();

-- 4. Configurer les settings (à faire manuellement via Supabase Dashboard)
-- ALTER DATABASE postgres SET app.supabase_url = 'https://votre-projet.supabase.co';
-- ALTER DATABASE postgres SET app.supabase_service_role_key = 'votre-service-role-key';

COMMENT ON FUNCTION auto_index_rapport() IS 'Indexe automatiquement un rapport après insertion/modification';
COMMENT ON TRIGGER trigger_auto_index_rapport ON rapports IS 'Indexation automatique à la création';
COMMENT ON TRIGGER trigger_auto_reindex_rapport ON rapports IS 'Ré-indexation automatique si contenu modifié';
