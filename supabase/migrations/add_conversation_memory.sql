-- =================================================================
-- MIGRATION : Mémoire Conversationnelle pour Assistant IA
-- =================================================================
-- Créé le : 13 novembre 2025
-- Objectif : Stocker l'historique des conversations pour permettre
--            des clarifications et un contexte continu
-- =================================================================

-- Supprimer les tables existantes si elles existent (pour repartir de zéro)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- 1. Table des conversations (sessions de chat)
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  titre TEXT,
  dernier_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des messages (historique)
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Index pour performance
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_client_id ON conversations(client_id);
CREATE INDEX idx_conversations_dernier_message ON conversations(dernier_message_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- 4. RLS (Row Level Security)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy pour conversations : user peut voir ses propres conversations
CREATE POLICY "Users can view their own conversations"
ON conversations FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own conversations"
ON conversations FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own conversations"
ON conversations FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own conversations"
ON conversations FOR DELETE
USING (user_id = auth.uid());

-- Policy pour messages : user peut voir les messages de ses conversations
CREATE POLICY "Users can view their own messages"
ON messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages in their conversations"
ON messages FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()
  )
);

-- 5. Fonction pour créer une nouvelle conversation
CREATE OR REPLACE FUNCTION create_conversation(
  p_user_id UUID,
  p_client_id UUID,
  p_titre TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  INSERT INTO conversations (user_id, client_id, titre)
  VALUES (p_user_id, p_client_id, p_titre)
  RETURNING id INTO v_conversation_id;

  RETURN v_conversation_id;
END;
$$;

-- 6. Fonction pour ajouter un message
CREATE OR REPLACE FUNCTION add_message(
  p_conversation_id UUID,
  p_role TEXT,
  p_content TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- Insérer le message
  INSERT INTO messages (conversation_id, role, content, metadata)
  VALUES (p_conversation_id, p_role, p_content, p_metadata)
  RETURNING id INTO v_message_id;

  -- Mettre à jour le timestamp de la conversation
  UPDATE conversations
  SET
    dernier_message_at = NOW(),
    updated_at = NOW()
  WHERE id = p_conversation_id;

  RETURN v_message_id;
END;
$$;

-- 7. Fonction pour récupérer l'historique d'une conversation
CREATE OR REPLACE FUNCTION get_conversation_history(
  p_conversation_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  role TEXT,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.role,
    m.content,
    m.metadata,
    m.created_at
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at ASC
  LIMIT p_limit;
END;
$$;

-- 8. Fonction pour lister les conversations d'un utilisateur
CREATE OR REPLACE FUNCTION list_user_conversations(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  titre TEXT,
  dernier_message_at TIMESTAMPTZ,
  nb_messages BIGINT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    COALESCE(c.titre, 'Conversation sans titre') as titre,
    c.dernier_message_at,
    COUNT(m.id) as nb_messages,
    c.created_at
  FROM conversations c
  LEFT JOIN messages m ON m.conversation_id = c.id
  WHERE c.user_id = p_user_id
  GROUP BY c.id, c.titre, c.dernier_message_at, c.created_at
  ORDER BY c.dernier_message_at DESC
  LIMIT p_limit;
END;
$$;

-- 9. Trigger pour générer automatiquement un titre si manquant
CREATE OR REPLACE FUNCTION generate_conversation_title()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.titre IS NULL THEN
    -- Prendre les 50 premiers caractères du premier message user
    SELECT SUBSTRING(content, 1, 50) || '...'
    INTO NEW.titre
    FROM messages
    WHERE conversation_id = NEW.id
      AND role = 'user'
    ORDER BY created_at ASC
    LIMIT 1;

    IF NEW.titre IS NULL THEN
      NEW.titre := 'Conversation du ' || TO_CHAR(NEW.created_at, 'DD/MM/YYYY');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_conversation_title
BEFORE UPDATE ON conversations
FOR EACH ROW
WHEN (OLD.titre IS NULL AND NEW.titre IS NULL)
EXECUTE FUNCTION generate_conversation_title();

-- =================================================================
-- COMMENTAIRES
-- =================================================================

COMMENT ON TABLE conversations IS
  'Table des sessions de conversation avec l''Assistant IA RAG';

COMMENT ON TABLE messages IS
  'Table de l''historique des messages (user + assistant)';

COMMENT ON FUNCTION create_conversation(UUID, UUID, TEXT) IS
  'Crée une nouvelle conversation pour un utilisateur';

COMMENT ON FUNCTION add_message(UUID, TEXT, TEXT, JSONB) IS
  'Ajoute un message à une conversation et met à jour le timestamp';

COMMENT ON FUNCTION get_conversation_history(UUID, INTEGER) IS
  'Récupère l''historique des N derniers messages d''une conversation';

COMMENT ON FUNCTION list_user_conversations(UUID, INTEGER) IS
  'Liste les conversations d''un utilisateur avec nombre de messages';

-- =================================================================
-- ✅ MIGRATION TERMINÉE
-- =================================================================

-- Pour tester :
/*
-- 1. Créer une conversation
SELECT create_conversation(
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM clients LIMIT 1),
  'Test de conversation'
);

-- 2. Ajouter des messages
SELECT add_message(
  'conversation-uuid',
  'user',
  'Quelles sont les dernières tendances ?'
);

SELECT add_message(
  'conversation-uuid',
  'assistant',
  'Voici les dernières tendances...'
);

-- 3. Récupérer l'historique
SELECT * FROM get_conversation_history('conversation-uuid', 10);

-- 4. Lister les conversations
SELECT * FROM list_user_conversations('user-uuid', 20);
*/
