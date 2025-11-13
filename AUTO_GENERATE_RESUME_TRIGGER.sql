-- ========================================
-- GÉNÉRATION AUTOMATIQUE DES RÉSUMÉS
-- Trigger qui génère automatiquement un résumé dès qu'un rapport est créé
-- ========================================

-- 1. Activer l'extension pg_net (pour faire des requêtes HTTP depuis PostgreSQL)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Créer une fonction qui appelle l'Edge Function generate-summary
CREATE OR REPLACE FUNCTION auto_generate_resume_for_rapport()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url text := 'https://xottryrwoxafervpovex.supabase.co'; -- REMPLACEZ par votre URL Supabase
  supabase_anon_key text := 'VOTRE_ANON_KEY'; -- REMPLACEZ par votre clé ANON
  request_id bigint;
BEGIN
  -- Vérifier que le rapport a un PDF et n'a pas encore de résumé
  IF NEW.pdf_url IS NOT NULL AND NEW.resume IS NULL THEN
    -- Appeler l'Edge Function en arrière-plan (asynchrone)
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/generate-summary',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || supabase_anon_key
      ),
      body := jsonb_build_object(
        'rapport_id', NEW.id::text
      )
    ) INTO request_id;

    RAISE NOTICE 'Génération automatique du résumé lancée pour rapport %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Créer le trigger qui s'exécute APRÈS l'insertion d'un rapport
DROP TRIGGER IF EXISTS trigger_auto_generate_resume ON rapports;

CREATE TRIGGER trigger_auto_generate_resume
  AFTER INSERT ON rapports
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_resume_for_rapport();

-- ========================================
-- VÉRIFICATION
-- ========================================

-- Voir les triggers actifs
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'rapports';

-- ========================================
-- TEST MANUEL (optionnel)
-- ========================================

-- Pour tester, insérez un rapport de test
-- Le résumé devrait être généré automatiquement après quelques secondes

/*
INSERT INTO rapports (
  client_id,
  titre,
  type_rapport,
  nb_sources,
  mots_cles,
  secteur,
  statut,
  pdf_url
) VALUES (
  'VOTRE_CLIENT_ID',
  'Rapport de test automatique',
  'quotidien',
  3,
  ARRAY['test', 'automatique'],
  'Intelligence Artificielle',
  'genere',
  'https://xottryrwoxafervpovex.supabase.co/storage/v1/object/public/rapports/pdf/test.pdf'
);

-- Attendre 5-10 secondes puis vérifier que le résumé a été généré
SELECT id, titre, resume
FROM rapports
WHERE titre = 'Rapport de test automatique';
*/

-- ========================================
-- DÉSACTIVER LE TRIGGER (si besoin)
-- ========================================

-- DROP TRIGGER IF EXISTS trigger_auto_generate_resume ON rapports;
-- DROP FUNCTION IF EXISTS auto_generate_resume_for_rapport();
