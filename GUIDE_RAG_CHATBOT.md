# 🤖 Guide : RAG Chatbot pour l'historique des veilles

## 🎯 Objectif

Créer un chatbot intelligent qui utilise RAG (Retrieval-Augmented Generation) pour permettre aux utilisateurs d'interroger leur historique de veilles et obtenir des réponses contextuelles basées sur leurs rapports passés.

---

## 📋 Qu'est-ce que RAG ?

**RAG (Retrieval-Augmented Generation)** = Récupération + Génération

### Processus en 3 étapes :

1. **Indexation** (une seule fois par rapport)
   - Découper le rapport en chunks (morceaux de texte)
   - Créer des embeddings (vecteurs) pour chaque chunk
   - Stocker dans une base de données vectorielle

2. **Récupération** (à chaque question)
   - Créer l'embedding de la question de l'utilisateur
   - Rechercher les chunks les plus similaires (similarity search)
   - Récupérer les 5-10 chunks les plus pertinents

3. **Génération** (à chaque question)
   - Envoyer les chunks pertinents + question à GPT
   - GPT génère une réponse basée sur le contexte fourni

---

## 🏗️ Architecture technique

### Stack recommandée

#### Backend
- **Supabase + pgvector** : Base de données vectorielle
- **OpenAI Embeddings** : `text-embedding-3-small` (moins cher et rapide)
- **OpenAI GPT-4** : Génération des réponses
- **Supabase Edge Functions** : API pour le RAG

#### Frontend
- **React + TypeScript** : Interface du chatbot
- **Nouvelle page** : `RAGChatPage.tsx`
- **Nouvel onglet** : "Assistant IA" ou "Interroger mes veilles"

---

## 🗄️ Base de données

### 1. Table `rapport_chunks` (nouvelle table)

```sql
CREATE TABLE rapport_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rapport_id UUID REFERENCES rapports(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(1536), -- OpenAI embeddings dimension
  metadata JSONB, -- Titre du rapport, date, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour la recherche vectorielle
CREATE INDEX ON rapport_chunks USING ivfflat (embedding vector_cosine_ops);

-- Index pour filtrer par client
CREATE INDEX ON rapport_chunks (client_id);
```

### 2. Extension pgvector

```sql
-- Activer l'extension pgvector dans Supabase
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Fonction de recherche par similarité

```sql
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
```

---

## 🔧 Backend : Supabase Edge Functions

### Structure des Edge Functions

```
supabase/functions/
├── index-rapport/         # Indexer un nouveau rapport (chunks + embeddings)
├── rag-query/             # Répondre à une question RAG
└── shared/
    └── openai.ts          # Utilitaires OpenAI partagés
```

### 1. Edge Function : `index-rapport`

**Fichier** : `supabase/functions/index-rapport/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const { rapport_id } = await req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Récupérer le rapport
    const { data: rapport, error: rapportError } = await supabase
      .from('rapports')
      .select('*, clients(id, secteur)')
      .eq('id', rapport_id)
      .single();

    if (rapportError) throw rapportError;

    // 2. Découper le contenu en chunks (environ 500 tokens par chunk)
    const chunks = chunkText(rapport.contenu || '', 500);

    // 3. Créer les embeddings pour chaque chunk
    const embeddings = await Promise.all(
      chunks.map(chunk => createEmbedding(chunk))
    );

    // 4. Insérer les chunks dans la base
    const chunksToInsert = chunks.map((chunk, idx) => ({
      rapport_id: rapport.id,
      client_id: rapport.client_id,
      chunk_text: chunk,
      chunk_index: idx,
      embedding: embeddings[idx],
      metadata: {
        titre: rapport.titre,
        date_rapport: rapport.date_rapport,
        secteur: rapport.clients?.secteur
      }
    }));

    const { error: insertError } = await supabase
      .from('rapport_chunks')
      .insert(chunksToInsert);

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, chunks_created: chunks.length }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// Découper le texte en chunks
function chunkText(text: string, maxTokens: number): string[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    // Approximation : 1 token ≈ 4 caractères
    if ((currentChunk + sentence).length / 4 > maxTokens) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence + '. ';
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks.filter(c => c.length > 50); // Ignorer les chunks trop courts
}

// Créer un embedding avec OpenAI
async function createEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    })
  });

  const data = await response.json();
  return data.data[0].embedding;
}
```

### 2. Edge Function : `rag-query`

**Fichier** : `supabase/functions/rag-query/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const { question, user_id } = await req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Récupérer le client_id
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user_id)
      .single();

    if (!client) throw new Error('Client not found');

    // 2. Créer l'embedding de la question
    const questionEmbedding = await createEmbedding(question);

    // 3. Rechercher les chunks similaires
    const { data: chunks, error: searchError } = await supabase
      .rpc('search_rapport_chunks', {
        query_embedding: questionEmbedding,
        user_client_id: client.id,
        match_threshold: 0.7,
        match_count: 10
      });

    if (searchError) throw searchError;

    if (!chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({
          answer: "Je n'ai pas trouvé d'informations pertinentes dans votre historique de veilles pour répondre à cette question."
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Construire le contexte pour GPT
    const context = chunks
      .map(chunk => `[${chunk.metadata.titre} - ${chunk.metadata.date_rapport}]\n${chunk.chunk_text}`)
      .join('\n\n---\n\n');

    // 5. Générer la réponse avec GPT-4
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `Tu es un assistant spécialisé dans l'analyse de veilles concurrentielles et technologiques.
Tu dois répondre aux questions de l'utilisateur en te basant UNIQUEMENT sur le contexte fourni (extraits de rapports de veille).

Instructions :
- Réponds de manière claire et structurée
- Cite les sources (titres des rapports et dates)
- Si l'information n'est pas dans le contexte, dis-le clairement
- Résume et synthétise les informations de plusieurs rapports si nécessaire`
          },
          {
            role: 'user',
            content: `Contexte (extraits de rapports de veille) :\n\n${context}\n\n---\n\nQuestion : ${question}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const gptData = await response.json();
    const answer = gptData.choices[0].message.content;

    // 6. Retourner la réponse avec les sources
    return new Response(
      JSON.stringify({
        answer,
        sources: chunks.map(c => ({
          titre: c.metadata.titre,
          date: c.metadata.date_rapport,
          excerpt: c.chunk_text.substring(0, 200) + '...'
        }))
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function createEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    })
  });

  const data = await response.json();
  return data.data[0].embedding;
}
```

---

## 🎨 Frontend : Interface RAG Chat

### 1. Nouvelle page : `RAGChatPage.tsx`

**Fichier** : `src/components/RAGChatPage.tsx`

```typescript
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Bot, User, FileText, Calendar, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  created_at: string;
}

interface Source {
  titre: string;
  date: string;
  excerpt: string;
}

export default function RAGChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Ajouter le message utilisateur
    const tempUserMessage: Message = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      // Appeler l'Edge Function RAG
      const { data, error } = await supabase.functions.invoke('rag-query', {
        body: {
          question: userMessage,
          user_id: user?.id
        }
      });

      if (error) throw error;

      // Ajouter la réponse de l'assistant
      const assistantMessage: Message = {
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: 'Désolé, une erreur s\'est produite. Veuillez réessayer.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-2 rounded-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Assistant IA</h1>
              <p className="text-sm text-gray-600">Interrogez votre historique de veilles</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-4 rounded-2xl mb-4">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                Posez-moi vos questions
              </h3>
              <p className="text-gray-600 max-w-md mb-6">
                Je peux analyser votre historique de veilles et répondre à vos questions sur les tendances, les concurrents, et plus encore.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
                <button
                  onClick={() => setInputMessage("Quelles sont les dernières tendances en IA ?")}
                  className="p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300 text-left transition-all"
                >
                  <div className="font-medium text-gray-900 mb-1">Tendances récentes</div>
                  <div className="text-sm text-gray-600">Quelles sont les dernières tendances ?</div>
                </button>
                <button
                  onClick={() => setInputMessage("Résume les activités de mes concurrents")}
                  className="p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-purple-300 text-left transition-all"
                >
                  <div className="font-medium text-gray-900 mb-1">Concurrents</div>
                  <div className="text-sm text-gray-600">Activités des concurrents</div>
                </button>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="animate-fadeIn">
              <div className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-orange-500 to-pink-500'
                    : 'bg-gradient-to-br from-blue-500 to-purple-500'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Message */}
                <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block max-w-[85%] p-4 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}>
                    <div className="whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                  </div>

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Sources utilisées :
                      </div>
                      {message.sources.map((source, idx) => (
                        <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="font-medium text-blue-900 text-sm mb-1">
                            {source.titre}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-blue-700 mb-2">
                            <Calendar className="w-3 h-3" />
                            {new Date(source.date).toLocaleDateString('fr-FR')}
                          </div>
                          <div className="text-xs text-gray-600 line-clamp-2">
                            {source.excerpt}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Loading */}
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 p-6 shadow-lg">
          <div className="max-w-4xl mx-auto flex gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Posez votre question sur vos veilles..."
              disabled={isLoading}
              className="flex-1 px-5 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 transition-all"
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 2. Ajouter l'onglet dans `MainApp.tsx`

```typescript
// Ajouter dans les types
type View = 'chat' | 'dashboard' | 'historique' | 'settings' | 'rag-assistant';

// Importer le composant
import RAGChatPage from './RAGChatPage';

// Ajouter dans le JSX
{currentView === 'rag-assistant' && (
  <RAGChatPage />
)}

// Ajouter un bouton dans le header du dashboard
<button
  onClick={() => setCurrentView('rag-assistant')}
  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-xl transition-all font-medium"
>
  <Bot size={16} />
  Assistant IA
</button>
```

---

## 🔄 Workflow complet

### 1. Indexation (automatique à la création d'un rapport)

**Option A : Trigger PostgreSQL**
```sql
CREATE OR REPLACE FUNCTION trigger_index_rapport()
RETURNS TRIGGER AS $$
BEGIN
  -- Appeler l'Edge Function d'indexation
  PERFORM net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/index-rapport',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb,
    body := json_build_object('rapport_id', NEW.id)::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_rapport_insert
AFTER INSERT ON rapports
FOR EACH ROW
EXECUTE FUNCTION trigger_index_rapport();
```

**Option B : Appel depuis n8n** (recommandé)
- Ajouter un nœud HTTP Request à la fin du workflow
- URL : `https://YOUR_PROJECT.supabase.co/functions/v1/index-rapport`
- Body : `{ "rapport_id": "{{ $json.rapport_id }}" }`

### 2. Requête RAG (à chaque question)

```
User → RAGChatPage → Edge Function `rag-query` → OpenAI Embeddings → Similarity Search → GPT-4 → Response
```

---

## 💰 Coûts estimés

### OpenAI API

| Composant | Modèle | Coût | Usage typique |
|-----------|--------|------|---------------|
| Embeddings | text-embedding-3-small | $0.02 / 1M tokens | ~10 rapports/jour × 2000 tokens = $0.0004/jour |
| Génération | GPT-4 Turbo | $10 / 1M tokens (input) + $30 / 1M tokens (output) | ~10 questions/jour × 2000 tokens = $0.20/jour |

**Total estimé** : ~$6/mois pour un usage normal (1 utilisateur, 10 questions/jour)

### Supabase
- **Gratuit** : Jusqu'à 500 MB de base de données
- **Pro ($25/mois)** : 8 GB + pgvector inclus

---

## 📊 Métriques et optimisations

### Améliorer la pertinence

1. **Taille des chunks**
   - Trop petits (< 200 tokens) : Perte de contexte
   - Trop grands (> 800 tokens) : Bruit et coût élevé
   - **Optimal** : 400-600 tokens

2. **Seuil de similarité**
   - Trop bas (< 0.6) : Résultats non pertinents
   - Trop haut (> 0.85) : Trop peu de résultats
   - **Optimal** : 0.7-0.75

3. **Nombre de chunks récupérés**
   - Trop peu (< 3) : Contexte insuffisant
   - Trop (> 15) : Coût élevé, bruit
   - **Optimal** : 8-10 chunks

---

## 🧪 Tests

### Test 1 : Indexation
1. Créer un nouveau rapport
2. Vérifier dans `rapport_chunks` que les chunks sont créés
3. **Résultat attendu** : 5-20 chunks par rapport selon la longueur

### Test 2 : Recherche
1. Poser une question simple : "Quelles sont les nouvelles de Google ?"
2. Vérifier que des chunks pertinents sont retournés
3. **Résultat attendu** : Réponse basée sur les rapports existants

### Test 3 : Performance
1. Indexer 100 rapports
2. Tester le temps de réponse
3. **Résultat attendu** : < 3 secondes par requête

---

## 🚀 Étapes de déploiement

### 1. Activer pgvector dans Supabase
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Créer la table rapport_chunks
```sql
-- Utiliser le script SQL fourni ci-dessus
```

### 3. Déployer les Edge Functions
```bash
supabase functions deploy index-rapport
supabase functions deploy rag-query
```

### 4. Configurer les secrets
```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

### 5. Indexer les rapports existants
```typescript
// Script one-time pour indexer les rapports existants
async function indexExistingRapports() {
  const { data: rapports } = await supabase
    .from('rapports')
    .select('id');

  for (const rapport of rapports) {
    await supabase.functions.invoke('index-rapport', {
      body: { rapport_id: rapport.id }
    });
  }
}
```

### 6. Ajouter l'interface frontend
- Créer `RAGChatPage.tsx`
- Ajouter l'onglet dans `MainApp.tsx`

---

## ✅ Checklist finale

- [ ] pgvector activé dans Supabase
- [ ] Table `rapport_chunks` créée
- [ ] Fonction `search_rapport_chunks` créée
- [ ] Edge Function `index-rapport` déployée
- [ ] Edge Function `rag-query` déployée
- [ ] OPENAI_API_KEY configuré
- [ ] Trigger ou workflow n8n pour auto-indexation
- [ ] Rapports existants indexés
- [ ] `RAGChatPage.tsx` créé
- [ ] Onglet "Assistant IA" ajouté
- [ ] Tests effectués

---

## 🎉 Résultat final

Les utilisateurs pourront :
- ✅ Poser des questions en langage naturel sur leur historique de veilles
- ✅ Obtenir des réponses contextuelles avec sources
- ✅ Analyser les tendances et patterns dans leurs rapports
- ✅ Comparer les activités des concurrents
- ✅ Extraire des insights de l'ensemble de leurs veilles

**Le RAG chatbot transforme l'historique passif en assistant intelligent !** 🤖✨
