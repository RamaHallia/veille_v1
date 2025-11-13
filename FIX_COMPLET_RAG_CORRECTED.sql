-- ========================================
-- SCRIPT DE CORRECTION COMPLET RAG (CORRIGÉ)
-- ========================================
-- Ce script corrige TOUS les problèmes identifiés
-- UTILISE text-embedding-3-small (1536 dimensions)
-- Compatible avec Supabase pgvector (max 2000 dimensions)
-- ========================================

-- ÉTAPE 1 : Vérifier le schéma actuel de rapport_chunks
DO $$
BEGIN
  RAISE NOTICE '🔍 Vérification du schéma rapport_chunks...';
END $$;

-- Afficher les colonnes actuelles
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'rapport_chunks'
ORDER BY ordinal_position;

-- ÉTAPE 2 : Supprimer et recréer la table avec le BON schéma
DO $$
BEGIN
  RAISE NOTICE '🗑️ Suppression de l ancienne table rapport_chunks...';
END $$;

DROP TABLE IF EXISTS rapport_chunks CASCADE;

-- ÉTAPE 3 : Activer pgvector (si pas déjà fait)
DO $$
BEGIN
  RAISE NOTICE '🔌 Activation de pgvector...';
END $$;

CREATE EXTENSION IF NOT EXISTS vector;

-- ÉTAPE 4 : Créer la table avec le BON schéma
DO $$
BEGIN
  RAISE NOTICE '📊 Création de la nouvelle table rapport_chunks...';
END $$;

CREATE TABLE rapport_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rapport_id UUID REFERENCES rapports(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,  -- ⚠️ Nom exact de la colonne
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(1536), -- ✅ text-embedding-3-small (1536 dimensions - compatible Supabase)
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÉTAPE 5 : Créer les index pour optimiser les performances
DO $$
BEGIN
  RAISE NOTICE '⚡ Création des index...';
END $$;

-- Index pour la recherche vectorielle (cosine similarity)
-- ✅ 1536 dimensions fonctionne avec ivfflat (< 2000)
CREATE INDEX rapport_chunks_embedding_idx
ON rapport_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index pour filtrer par client
CREATE INDEX rapport_chunks_client_id_idx
ON rapport_chunks (client_id);

-- Index pour filtrer par rapport
CREATE INDEX rapport_chunks_rapport_id_idx
ON rapport_chunks (rapport_id);

-- ÉTAPE 6 : Créer la fonction de recherche par similarité
DO $$
BEGIN
  RAISE NOTICE '🔧 Création de la fonction search_rapport_chunks...';
END $$;

CREATE OR REPLACE FUNCTION search_rapport_chunks(
  query_embedding VECTOR(1536),  -- ✅ 1536 dimensions
  user_client_id UUID,
  match_threshold FLOAT DEFAULT 0.5,  -- Abaissé à 0.5 pour plus de résultats
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  rapport_id UUID,
  chunk_text TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rapport_chunks.id,
    rapport_chunks.rapport_id,
    rapport_chunks.chunk_text,  -- ⚠️ Nom exact de la colonne
    rapport_chunks.metadata,
    1 - (rapport_chunks.embedding <=> query_embedding) AS similarity
  FROM rapport_chunks
  WHERE rapport_chunks.client_id = user_client_id
    AND 1 - (rapport_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY rapport_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ÉTAPE 7 : Ajouter les colonnes manquantes à la table rapports (si nécessaire)
DO $$
BEGIN
  RAISE NOTICE '📝 Ajout des colonnes à la table rapports...';
END $$;

-- Ajouter indexe_rag si elle n'existe pas
ALTER TABLE rapports
ADD COLUMN IF NOT EXISTS indexe_rag BOOLEAN DEFAULT FALSE;

-- Ajouter date_indexation si elle n'existe pas
ALTER TABLE rapports
ADD COLUMN IF NOT EXISTS date_indexation TIMESTAMPTZ;

-- Ajouter resume si elle n'existe pas (nécessaire pour indexation)
ALTER TABLE rapports
ADD COLUMN IF NOT EXISTS resume TEXT;

-- Ajouter mots_cles si elle n'existe pas
ALTER TABLE rapports
ADD COLUMN IF NOT EXISTS mots_cles TEXT[];

-- Ajouter secteur si elle n'existe pas
ALTER TABLE rapports
ADD COLUMN IF NOT EXISTS secteur TEXT;

-- ÉTAPE 8 : Activer RLS sur rapport_chunks
DO $$
BEGIN
  RAISE NOTICE '🔒 Configuration de la sécurité RLS...';
END $$;

ALTER TABLE rapport_chunks ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view their own chunks" ON rapport_chunks;
DROP POLICY IF EXISTS "Service role can do everything" ON rapport_chunks;

-- Policy : Les utilisateurs ne peuvent voir que leurs propres chunks
CREATE POLICY "Users can view their own chunks"
ON rapport_chunks FOR SELECT
USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);

-- Policy : Service role peut tout faire
CREATE POLICY "Service role can do everything"
ON rapport_chunks FOR ALL
USING (true)
WITH CHECK (true);

-- ÉTAPE 9 : Mettre à jour les rapports existants qui ont déjà des chunks (anciens)
-- Les marquer comme "à réindexer"
DO $$
BEGIN
  RAISE NOTICE '🔄 Marquage des rapports à réindexer...';
END $$;

UPDATE rapports
SET indexe_rag = FALSE, date_indexation = NULL
WHERE id IN (
  SELECT DISTINCT rapport_id
  FROM rapport_chunks
  WHERE 1=1 -- Anciens chunks à supprimer
);

-- Supprimer tous les anciens chunks (ils seront réindexés avec le nouveau modèle)
DELETE FROM rapport_chunks;

-- ÉTAPE 10 : Vérifications finales
DO $$
DECLARE
  v_chunks_count INTEGER;
  v_rapports_count INTEGER;
  v_function_exists BOOLEAN;
BEGIN
  RAISE NOTICE '✅ Vérifications finales...';

  -- Vérifier que pgvector est activé
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'Extension vector not installed';
  END IF;
  RAISE NOTICE '  ✓ Extension vector activée';

  -- Vérifier que la table existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rapport_chunks') THEN
    RAISE EXCEPTION 'Table rapport_chunks not created';
  END IF;
  RAISE NOTICE '  ✓ Table rapport_chunks créée';

  -- Vérifier que la colonne chunk_text existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rapport_chunks' AND column_name = 'chunk_text'
  ) THEN
    RAISE EXCEPTION 'Column chunk_text not found';
  END IF;
  RAISE NOTICE '  ✓ Colonne chunk_text existe';

  -- Vérifier la dimension des embeddings
  DECLARE
    v_dimension INTEGER;
  BEGIN
    SELECT atttypmod INTO v_dimension
    FROM pg_attribute
    WHERE attrelid = 'rapport_chunks'::regclass
    AND attname = 'embedding';

    IF v_dimension = 1536 THEN
      RAISE NOTICE '  ✓ Embeddings: 1536 dimensions (text-embedding-3-small)';
    ELSE
      RAISE NOTICE '  ⚠️  Embeddings: % dimensions', v_dimension;
    END IF;
  END;

  -- Vérifier que la fonction existe
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'search_rapport_chunks'
  ) INTO v_function_exists;

  IF NOT v_function_exists THEN
    RAISE EXCEPTION 'Function search_rapport_chunks not created';
  END IF;
  RAISE NOTICE '  ✓ Fonction search_rapport_chunks créée';

  -- Compter les rapports
  SELECT COUNT(*) INTO v_rapports_count FROM rapports;
  RAISE NOTICE '  ✓ Rapports disponibles: %', v_rapports_count;

  -- Compter les chunks
  SELECT COUNT(*) INTO v_chunks_count FROM rapport_chunks;
  RAISE NOTICE '  ✓ Chunks indexés: % (normal si 0, ils seront réindexés)', v_chunks_count;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '🎉 SETUP RAG TERMINÉ AVEC SUCCÈS !';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 CONFIGURATION :';
  RAISE NOTICE '  • Modèle: text-embedding-3-small';
  RAISE NOTICE '  • Dimensions: 1536';
  RAISE NOTICE '  • Index: ivfflat (compatible Supabase)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PROCHAINES ÉTAPES :';
  RAISE NOTICE '  1. Déployez les Edge Functions avec text-embedding-3-small';
  RAISE NOTICE '  2. Configurez OPENAI_API_KEY dans Supabase';
  RAISE NOTICE '  3. Lancez l indexation (automatique ou via n8n)';
  RAISE NOTICE '  4. Testez l Assistant IA !';
  RAISE NOTICE '';
END $$;

-- ÉTAPE 11 : Créer une vue pour faciliter le monitoring
CREATE OR REPLACE VIEW v_rag_status AS
SELECT
  c.id as client_id,
  c.email,
  COUNT(DISTINCT r.id) as total_rapports,
  COUNT(DISTINCT CASE WHEN r.indexe_rag THEN r.id END) as rapports_indexes,
  COUNT(rc.id) as total_chunks,
  MAX(rc.created_at) as derniere_indexation
FROM clients c
LEFT JOIN rapports r ON r.client_id = c.id
LEFT JOIN rapport_chunks rc ON rc.client_id = c.id
GROUP BY c.id, c.email;

COMMENT ON VIEW v_rag_status IS 'Vue du statut RAG par client (monitoring)';

-- Message final
DO $$
BEGIN
  RAISE NOTICE '✅ Script terminé !';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Vos Edge Functions doivent utiliser text-embedding-3-small';
  RAISE NOTICE '   Vérifiez les fichiers :';
  RAISE NOTICE '   - supabase/functions/rag-query/index.ts';
  RAISE NOTICE '   - supabase/functions/index-rapport/index.ts';
  RAISE NOTICE '';
END $$;

-- Exemple de requête pour voir le statut
-- SELECT * FROM v_rag_status;
