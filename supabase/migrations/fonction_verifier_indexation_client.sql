-- =================================================================
-- FONCTION : Vérifier et Indexer les Rapports Manquants
-- =================================================================
-- Créé le : 13 novembre 2025
-- Objectif : Vérifier si tous les rapports d'un client sont indexés
--            et déclencher l'indexation des rapports manquants
-- =================================================================

-- 1. Fonction pour obtenir les rapports non indexés d'un client
CREATE OR REPLACE FUNCTION get_rapports_non_indexes(p_user_id TEXT)
RETURNS TABLE (
  rapport_id UUID,
  titre TEXT,
  date_generation TIMESTAMPTZ,
  has_content BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id as rapport_id,
    r.titre,
    r.date_generation,
    (r.contenu_html IS NOT NULL OR r.resume IS NOT NULL) as has_content
  FROM rapports r
  JOIN clients c ON c.id = r.client_id
  WHERE c.user_id = p_user_id
    AND (r.indexe_rag IS NULL OR r.indexe_rag = false)
    AND (r.contenu_html IS NOT NULL OR r.resume IS NOT NULL)
  ORDER BY r.date_generation DESC;
END;
$$;

-- 2. Fonction pour indexer tous les rapports manquants d'un client
CREATE OR REPLACE FUNCTION indexer_rapports_manquants(p_user_id TEXT)
RETURNS TABLE (
  total_rapports INTEGER,
  rapports_a_indexer INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_edge_function_url TEXT;
  v_rapport RECORD;
  v_count INTEGER := 0;
  v_total INTEGER := 0;
BEGIN
  -- Configuration
  v_supabase_url := 'https://xottryrwoxafervpovex.supabase.co';

  -- ⚠️ REMPLACEZ avec votre vraie clé Service Role
  v_service_role_key := 'VOTRE_SERVICE_ROLE_KEY_ICI';

  v_edge_function_url := v_supabase_url || '/functions/v1/index-rapport';

  -- Compter le total de rapports du client
  SELECT COUNT(*) INTO v_total
  FROM rapports r
  JOIN clients c ON c.id = r.client_id
  WHERE c.user_id = p_user_id;

  -- Logger
  RAISE LOG '📊 Client % : % rapports au total', p_user_id, v_total;

  -- Boucle sur tous les rapports non indexés
  FOR v_rapport IN
    SELECT r.id, r.titre
    FROM rapports r
    JOIN clients c ON c.id = r.client_id
    WHERE c.user_id = p_user_id
      AND (r.indexe_rag IS NULL OR r.indexe_rag = false)
      AND (r.contenu_html IS NOT NULL OR r.resume IS NOT NULL)
    ORDER BY r.date_generation DESC
  LOOP
    -- Logger
    RAISE LOG '🚀 Indexation de : % (ID: %)', v_rapport.titre, v_rapport.id;

    -- Appeler l'Edge Function pour ce rapport
    BEGIN
      PERFORM net.http_post(
        url := v_edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_key
        ),
        body := jsonb_build_object(
          'rapport_id', v_rapport.id::text
        ),
        timeout_milliseconds := 60000
      );

      v_count := v_count + 1;

      RAISE LOG '✅ Indexation déclenchée pour : %', v_rapport.titre;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '❌ Erreur indexation % : %', v_rapport.titre, SQLERRM;
    END;
  END LOOP;

  -- Retourner le résultat
  RETURN QUERY
  SELECT
    v_total as total_rapports,
    v_count as rapports_a_indexer,
    CASE
      WHEN v_count = 0 THEN 'Tous les rapports sont déjà indexés'
      ELSE format('Indexation de %s rapports déclenchée', v_count)
    END as status;
END;
$$;

-- 3. Fonction pour vérifier le statut d'indexation d'un client
CREATE OR REPLACE FUNCTION check_indexation_status(p_user_id TEXT)
RETURNS TABLE (
  total_rapports INTEGER,
  rapports_indexes INTEGER,
  rapports_non_indexes INTEGER,
  total_chunks INTEGER,
  pourcentage_indexe NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT r.id)::INTEGER as total_rapports,
    COUNT(DISTINCT CASE WHEN r.indexe_rag = true THEN r.id END)::INTEGER as rapports_indexes,
    COUNT(DISTINCT CASE WHEN (r.indexe_rag IS NULL OR r.indexe_rag = false) THEN r.id END)::INTEGER as rapports_non_indexes,
    COUNT(rc.id)::INTEGER as total_chunks,
    ROUND(
      (COUNT(DISTINCT CASE WHEN r.indexe_rag = true THEN r.id END)::NUMERIC /
       NULLIF(COUNT(DISTINCT r.id)::NUMERIC, 0)) * 100,
      2
    ) as pourcentage_indexe
  FROM rapports r
  JOIN clients c ON c.id = r.client_id
  LEFT JOIN rapport_chunks rc ON rc.rapport_id = r.id
  WHERE c.user_id = p_user_id;
END;
$$;

-- =================================================================
-- COMMENTAIRES
-- =================================================================

COMMENT ON FUNCTION get_rapports_non_indexes(TEXT) IS
  'Retourne la liste des rapports non indexés pour un client donné';

COMMENT ON FUNCTION indexer_rapports_manquants(TEXT) IS
  'Déclenche l''indexation de tous les rapports non indexés d''un client. Appelle l''Edge Function index-rapport pour chaque rapport.';

COMMENT ON FUNCTION check_indexation_status(TEXT) IS
  'Retourne le statut d''indexation d''un client : nombre de rapports, chunks, pourcentage indexé';

-- =================================================================
-- EXEMPLES D'UTILISATION
-- =================================================================

/*
-- 1. Vérifier le statut d'indexation d'un client
SELECT * FROM check_indexation_status('user-uuid');

-- Résultat :
-- total_rapports | rapports_indexes | rapports_non_indexes | total_chunks | pourcentage_indexe
-- 84             | 50               | 34                   | 750          | 59.52

-- 2. Obtenir la liste des rapports non indexés
SELECT * FROM get_rapports_non_indexes('user-uuid');

-- Résultat :
-- rapport_id                           | titre                    | date_generation     | has_content
-- xxx-xxx-xxx                          | Rapport IA 13/11         | 2025-11-13 10:00:00 | true

-- 3. Indexer tous les rapports manquants
SELECT * FROM indexer_rapports_manquants('user-uuid');

-- Résultat :
-- total_rapports | rapports_a_indexer | status
-- 84             | 34                 | Indexation de 34 rapports déclenchée
*/

-- =================================================================
-- PERMISSIONS (RLS)
-- =================================================================

-- Les fonctions utilisent SECURITY DEFINER, donc elles s'exécutent
-- avec les privilèges du propriétaire de la fonction (pas du user)
-- Cela permet de contourner les RLS policies si nécessaire

-- =================================================================
-- ✅ SCRIPT PRÊT
-- =================================================================

-- TODO AVANT D'EXÉCUTER :
-- 1. Remplacez "VOTRE_SERVICE_ROLE_KEY_ICI" (ligne 43)
-- 2. Exécutez ce script dans Supabase SQL Editor
