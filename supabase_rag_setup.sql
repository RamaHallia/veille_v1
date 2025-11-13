-- ========================================
-- Setup RAG avec pgvector pour Supabase
-- ========================================

-- 1. Activer l'extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Créer la table rapport_chunks
CREATE TABLE IF NOT EXISTS rapport_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rapport_id UUID REFERENCES rapports(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(1536), -- Dimension des embeddings OpenAI text-embedding-3-small
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Créer les index pour optimiser les performances
-- Index pour la recherche vectorielle (cosine similarity)
CREATE INDEX IF NOT EXISTS rapport_chunks_embedding_idx
ON rapport_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index pour filtrer par client
CREATE INDEX IF NOT EXISTS rapport_chunks_client_id_idx
ON rapport_chunks (client_id);

-- Index pour filtrer par rapport
CREATE INDEX IF NOT EXISTS rapport_chunks_rapport_id_idx
ON rapport_chunks (rapport_id);

-- 4. Fonction de recherche par similarité
CREATE OR REPLACE FUNCTION search_rapport_chunks(
  query_embedding VECTOR(1536),
  user_client_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
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
    rapport_chunks.chunk_text,
    rapport_chunks.metadata,
    1 - (rapport_chunks.embedding <=> query_embedding) AS similarity
  FROM rapport_chunks
  WHERE rapport_chunks.client_id = user_client_id
    AND 1 - (rapport_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY rapport_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. (Optionnel) Trigger pour auto-indexation des nouveaux rapports
-- Note: Nécessite l'extension pg_net
-- Décommenter si vous voulez l'auto-indexation via trigger

/*
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION trigger_index_rapport()
RETURNS TRIGGER AS $$
DECLARE
  request_id BIGINT;
BEGIN
  -- Appeler l'Edge Function d'indexation
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/index-rapport',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object('rapport_id', NEW.id)
  ) INTO request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_rapport_insert
AFTER INSERT ON rapports
FOR EACH ROW
EXECUTE FUNCTION trigger_index_rapport();
*/

-- 6. Vérifications
DO $$
BEGIN
  -- Vérifier que l'extension vector est activée
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'Extension vector not installed';
  END IF;

  -- Vérifier que la table existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rapport_chunks') THEN
    RAISE EXCEPTION 'Table rapport_chunks not created';
  END IF;

  RAISE NOTICE '✅ Setup RAG terminé avec succès !';
END $$;

-- 7. Exemple de requête de test
-- SELECT * FROM search_rapport_chunks(
--   query_embedding := (SELECT embedding FROM rapport_chunks LIMIT 1), -- Utiliser un embedding existant pour tester
--   user_client_id := 'UUID_DU_CLIENT',
--   match_threshold := 0.7,
--   match_count := 5
-- );

COMMENT ON TABLE rapport_chunks IS 'Stocke les chunks de texte et leurs embeddings pour la recherche vectorielle RAG';
COMMENT ON FUNCTION search_rapport_chunks IS 'Recherche les chunks les plus similaires à une requête vectorielle';
