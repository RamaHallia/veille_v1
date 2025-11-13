-- =================================================================
-- TRIGGER : Indexation Automatique des Rapports (PRÉ-CONFIGURÉ)
-- =================================================================
-- Créé le : 13 novembre 2025
-- Projet : https://xottryrwoxafervpovex.supabase.co
-- =================================================================
-- ⚠️ IMPORTANT : Remplacez VOTRE_SERVICE_ROLE_KEY ci-dessous
--    (trouvez-la dans Supabase Dashboard → Settings → API)
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
  -- URL Supabase (déjà configurée pour votre projet)
  supabase_url := 'https://xottryrwoxafervpovex.supabase.co';

  -- ⚠️ REMPLACEZ CETTE LIGNE avec votre vraie clé Service Role
  -- Dashboard → Settings → API → service_role key (secret)
  service_role_key := 'VOTRE_SERVICE_ROLE_KEY_ICI';

  -- Construire l'URL de l'Edge Function
  edge_function_url := supabase_url || '/functions/v1/index-rapport';

  -- Logger l'appel
  RAISE LOG '🚀 Auto-indexation déclenchée pour rapport_id: %', NEW.id;
  RAISE LOG '📍 URL: %', edge_function_url;

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
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, logger mais ne pas bloquer l'insertion
    RAISE WARNING '❌ Erreur lors de l''appel à index-rapport: %', SQLERRM;
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
  'Fonction trigger qui appelle automatiquement l''Edge Function index-rapport dès qu''un rapport est créé ou modifié. Projet: xottryrwoxafervpovex';

COMMENT ON TRIGGER trigger_auto_index_new_rapport ON rapports IS
  'Déclenche l''indexation automatique immédiate quand un nouveau rapport est inséré';

COMMENT ON TRIGGER trigger_auto_reindex_rapport ON rapports IS
  'Déclenche la ré-indexation automatique quand le contenu d''un rapport est modifié';

-- =================================================================
-- ✅ SCRIPT PRÊT
-- =================================================================

-- TODO AVANT D'EXÉCUTER :
-- 1. Allez dans Supabase Dashboard → Settings → API
-- 2. Copiez la clé "service_role key" (section Project API keys)
-- 3. Remplacez "VOTRE_SERVICE_ROLE_KEY_ICI" ci-dessus (ligne 28)
-- 4. Exécutez ce script dans SQL Editor

-- Pour tester après installation :
/*
INSERT INTO rapports (client_id, titre, contenu_html)
VALUES (
  (SELECT id FROM clients LIMIT 1),
  'Test Trigger Auto',
  '<p>Test de contenu</p>'
);

-- Vérifier l'indexation (attendre 30 secondes)
SELECT
  r.titre,
  r.indexe_rag,
  COUNT(rc.id) as nb_chunks
FROM rapports r
LEFT JOIN rapport_chunks rc ON rc.rapport_id = r.id
WHERE r.titre = 'Test Trigger Auto'
GROUP BY r.id, r.titre, r.indexe_rag;
*/
