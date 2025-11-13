-- ========================================
-- DEBUG SQL - Exécutez ces commandes UNE PAR UNE
-- Copiez le résultat de CHAQUE commande
-- ========================================

-- ========================================
-- ÉTAPE 1 : Vérifier que les colonnes existent
-- ========================================
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'clients'
  AND column_name IN ('email_destinataires', 'email_cc');

-- RÉSULTAT ATTENDU : 2 lignes avec email_destinataires et email_cc
-- ========================================


-- ========================================
-- ÉTAPE 2 : Voir les données actuelles
-- ========================================
SELECT
  id,
  user_id,
  prenom,
  email_destinataires,
  email_cc
FROM clients
WHERE user_id = '5fa9d9df-2008-4fcd-9f05-0aaed9a1e68e';

-- COPIEZ LE RÉSULTAT ICI (notamment email_destinataires et email_cc)
-- ========================================


-- ========================================
-- ÉTAPE 3 : Désactiver TEMPORAIREMENT le RLS
-- ========================================
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- RÉSULTAT ATTENDU : "ALTER TABLE"
-- ========================================


-- ========================================
-- ÉTAPE 4 : Essayer l'UPDATE sans RLS
-- ========================================
UPDATE clients
SET
  email_destinataires = ARRAY['test1@example.com', 'test2@example.com']::text[],
  email_cc = ARRAY['cc@example.com']::text[]
WHERE user_id = '5fa9d9df-2008-4fcd-9f05-0aaed9a1e68e';

-- RÉSULTAT ATTENDU : "UPDATE 1"
-- ========================================


-- ========================================
-- ÉTAPE 5 : Vérifier que l'UPDATE a fonctionné
-- ========================================
SELECT
  email_destinataires,
  email_cc,
  updated_at
FROM clients
WHERE user_id = '5fa9d9df-2008-4fcd-9f05-0aaed9a1e68e';

-- COPIEZ LE RÉSULTAT ICI
-- SI email_destinataires = ["test1@example.com", "test2@example.com"]
-- ALORS le problème vient UNIQUEMENT du RLS
-- ========================================


-- ========================================
-- ÉTAPE 6 : Réactiver le RLS
-- ========================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- RÉSULTAT ATTENDU : "ALTER TABLE"
-- ========================================


-- ========================================
-- ÉTAPE 7 : Supprimer TOUTES les anciennes politiques
-- ========================================
DROP POLICY IF EXISTS "Users can update their own client config" ON clients;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON clients;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON clients;

-- Supprimer toute autre politique update
-- ========================================


-- ========================================
-- ÉTAPE 8 : Créer UNE SEULE politique UPDATE simple
-- ========================================
CREATE POLICY "allow_user_update_own_config"
ON clients
FOR UPDATE
TO authenticated
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- RÉSULTAT ATTENDU : "CREATE POLICY"
-- ========================================


-- ========================================
-- ÉTAPE 9 : Vérifier la politique créée
-- ========================================
SELECT
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'clients' AND cmd = 'UPDATE';

-- COPIEZ LE RÉSULTAT ICI
-- ========================================


-- ========================================
-- ÉTAPE 10 : Test final avec la nouvelle politique
-- ========================================
UPDATE clients
SET
  email_destinataires = ARRAY['final-test@example.com']::text[]
WHERE user_id = '5fa9d9df-2008-4fcd-9f05-0aaed9a1e68e';

-- RÉSULTAT ATTENDU : "UPDATE 1"
-- SI ça échoue, copiez l'ERREUR EXACTE
-- ========================================


-- ========================================
-- ÉTAPE 11 : Vérification finale
-- ========================================
SELECT
  email_destinataires,
  email_cc
FROM clients
WHERE user_id = '5fa9d9df-2008-4fcd-9f05-0aaed9a1e68e';

-- RÉSULTAT ATTENDU : email_destinataires = ["final-test@example.com"]
-- ========================================
