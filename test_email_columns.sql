-- Test pour vérifier les colonnes email_destinataires et email_cc

-- 1. Vérifier que les colonnes existent
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'clients'
AND column_name IN ('email_destinataires', 'email_cc');

-- 2. Vérifier les données actuelles
SELECT id, user_id, prenom, email_destinataires, email_cc
FROM clients
LIMIT 5;

-- 3. Test d'insertion manuelle (remplacez USER_ID par votre vrai user_id)
-- UPDATE clients
-- SET email_destinataires = ARRAY['test1@example.com', 'test2@example.com'],
--     email_cc = ARRAY['cc1@example.com']
-- WHERE user_id = 'VOTRE_USER_ID';
