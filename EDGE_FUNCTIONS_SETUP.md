# 🚀 Setup des Edge Functions pour le RAG

## 📦 Prérequis

1. **Supabase CLI installé**
   ```bash
   npm install -g supabase
   ```

2. **Clé API OpenAI**
   - Obtenir une clé sur https://platform.openai.com/api-keys

3. **Projet Supabase lié**
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```

---

## 📁 Structure des dossiers

```
supabase/
└── functions/
    ├── index-rapport/
    │   └── index.ts
    ├── rag-query/
    │   └── index.ts
    └── shared/
        └── openai.ts
```

---

## 1️⃣ Créer les dossiers

```bash
mkdir -p supabase/functions/index-rapport
mkdir -p supabase/functions/rag-query
mkdir -p supabase/functions/shared
```

---

## 2️⃣ Fichier partagé : `shared/openai.ts`

**Fichier** : `supabase/functions/shared/openai.ts`

```typescript
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

export async function createEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

export function chunkText(text: string, maxTokens: number = 500): string[] {
  // Nettoyer le texte
  const cleaned = text.replace(/\s+/g, ' ').trim();

  // Découper par phrases
  const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 0);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    // Approximation : 1 token ≈ 4 caractères
    const estimatedTokens = (currentChunk + trimmedSentence).length / 4;

    if (estimatedTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmedSentence + '. ';
    } else {
      currentChunk += trimmedSentence + '. ';
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  // Filtrer les chunks trop courts (< 50 caractères)
  return chunks.filter(c => c.length >= 50);
}
```

---

## 3️⃣ Edge Function : `index-rapport`

**Fichier** : `supabase/functions/index-rapport/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createEmbedding, chunkText } from '../shared/openai.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { rapport_id } = await req.json();

    if (!rapport_id) {
      throw new Error('rapport_id is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`📋 Indexing rapport: ${rapport_id}`);

    // 1. Récupérer le rapport
    const { data: rapport, error: rapportError } = await supabase
      .from('rapports')
      .select('*, clients(id, secteur)')
      .eq('id', rapport_id)
      .single();

    if (rapportError) {
      console.error('Error fetching rapport:', rapportError);
      throw rapportError;
    }

    if (!rapport.contenu || rapport.contenu.trim().length === 0) {
      console.warn('Rapport has no content to index');
      return new Response(
        JSON.stringify({ success: true, chunks_created: 0, message: 'No content to index' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📄 Rapport content length: ${rapport.contenu.length} characters`);

    // 2. Découper le contenu en chunks
    const chunks = chunkText(rapport.contenu, 500);
    console.log(`✂️ Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      console.warn('No valid chunks created');
      return new Response(
        JSON.stringify({ success: true, chunks_created: 0, message: 'No valid chunks' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Créer les embeddings pour chaque chunk
    console.log('🔄 Creating embeddings...');
    const embeddings = await Promise.all(
      chunks.map(async (chunk, idx) => {
        console.log(`  Creating embedding ${idx + 1}/${chunks.length}`);
        return await createEmbedding(chunk);
      })
    );

    console.log('✅ All embeddings created');

    // 4. Supprimer les anciens chunks de ce rapport (si réindexation)
    await supabase
      .from('rapport_chunks')
      .delete()
      .eq('rapport_id', rapport_id);

    // 5. Insérer les nouveaux chunks
    const chunksToInsert = chunks.map((chunk, idx) => ({
      rapport_id: rapport.id,
      client_id: rapport.client_id,
      chunk_text: chunk,
      chunk_index: idx,
      embedding: embeddings[idx],
      metadata: {
        titre: rapport.titre,
        date_rapport: rapport.date_rapport,
        secteur: rapport.clients?.secteur || null
      }
    }));

    const { error: insertError } = await supabase
      .from('rapport_chunks')
      .insert(chunksToInsert);

    if (insertError) {
      console.error('Error inserting chunks:', insertError);
      throw insertError;
    }

    console.log(`✅ Successfully indexed ${chunks.length} chunks for rapport ${rapport_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        chunks_created: chunks.length,
        rapport_id: rapport_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## 4️⃣ Edge Function : `rag-query`

**Fichier** : `supabase/functions/rag-query/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createEmbedding } from '../shared/openai.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { question, user_id } = await req.json();

    if (!question || !user_id) {
      throw new Error('question and user_id are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`🔍 Query from user: ${user_id}`);
    console.log(`❓ Question: ${question}`);

    // 1. Récupérer le client_id
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user_id)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    console.log(`👤 Client ID: ${client.id}`);

    // 2. Créer l'embedding de la question
    console.log('🔄 Creating question embedding...');
    const questionEmbedding = await createEmbedding(question);

    // 3. Rechercher les chunks similaires
    console.log('🔎 Searching similar chunks...');
    const { data: chunks, error: searchError } = await supabase
      .rpc('search_rapport_chunks', {
        query_embedding: questionEmbedding,
        user_client_id: client.id,
        match_threshold: 0.7,
        match_count: 10
      });

    if (searchError) {
      console.error('Search error:', searchError);
      throw searchError;
    }

    console.log(`📚 Found ${chunks?.length || 0} relevant chunks`);

    if (!chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({
          answer: "Je n'ai pas trouvé d'informations pertinentes dans votre historique de veilles pour répondre à cette question. Assurez-vous que vos rapports ont été indexés.",
          sources: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Construire le contexte pour GPT
    const context = chunks
      .map(chunk =>
        `[${chunk.metadata.titre} - ${new Date(chunk.metadata.date_rapport).toLocaleDateString('fr-FR')}]\n${chunk.chunk_text}`
      )
      .join('\n\n---\n\n');

    console.log(`📝 Context length: ${context.length} characters`);

    // 5. Générer la réponse avec GPT-4
    console.log('🤖 Generating answer with GPT-4...');
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
- Réponds de manière claire, structurée et professionnelle
- Cite les sources (titres des rapports et dates) pour chaque information importante
- Si l'information n'est pas dans le contexte, dis-le clairement
- Résume et synthétise les informations de plusieurs rapports si nécessaire
- Utilise des bullet points pour les listes
- Sois concis mais complet`
          },
          {
            role: 'user',
            content: `Contexte (extraits de rapports de veille) :\n\n${context}\n\n---\n\nQuestion : ${question}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const gptData = await response.json();
    const answer = gptData.choices[0].message.content;

    console.log('✅ Answer generated successfully');

    // 6. Retourner la réponse avec les sources
    return new Response(
      JSON.stringify({
        answer,
        sources: chunks.slice(0, 5).map(c => ({
          titre: c.metadata.titre,
          date: c.metadata.date_rapport,
          excerpt: c.chunk_text.substring(0, 200) + '...',
          similarity: c.similarity
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## 5️⃣ Déploiement

### Étape 1 : Configurer les secrets

```bash
# Définir la clé OpenAI
supabase secrets set OPENAI_API_KEY=sk-proj-...

# Vérifier les secrets
supabase secrets list
```

### Étape 2 : Déployer les Edge Functions

```bash
# Déployer index-rapport
supabase functions deploy index-rapport

# Déployer rag-query
supabase functions deploy rag-query

# Vérifier le déploiement
supabase functions list
```

---

## 6️⃣ Tester les Edge Functions

### Test 1 : Indexer un rapport

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/index-rapport \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"rapport_id": "UUID_DU_RAPPORT"}'
```

### Test 2 : Requête RAG

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/rag-query \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Quelles sont les dernières tendances ?",
    "user_id": "UUID_USER"
  }'
```

---

## 7️⃣ Indexer les rapports existants

**Option A : Script TypeScript**

Créer `scripts/index-existing-reports.ts` :

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://YOUR_PROJECT_REF.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function indexAllReports() {
  console.log('🚀 Starting indexation of existing reports...');

  // Récupérer tous les rapports
  const { data: rapports, error } = await supabase
    .from('rapports')
    .select('id, titre');

  if (error) {
    console.error('Error fetching reports:', error);
    return;
  }

  console.log(`📊 Found ${rapports.length} reports to index`);

  // Indexer chaque rapport
  for (let i = 0; i < rapports.length; i++) {
    const rapport = rapports[i];
    console.log(`\n[${i + 1}/${rapports.length}] Indexing: ${rapport.titre}`);

    try {
      const { data, error } = await supabase.functions.invoke('index-rapport', {
        body: { rapport_id: rapport.id }
      });

      if (error) {
        console.error(`  ❌ Error:`, error);
      } else {
        console.log(`  ✅ Success: ${data.chunks_created} chunks created`);
      }

      // Pause de 1 seconde entre chaque rapport pour éviter rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`  ❌ Error:`, err);
    }
  }

  console.log('\n🎉 Indexation completed!');
}

indexAllReports();
```

Exécuter :
```bash
npx tsx scripts/index-existing-reports.ts
```

**Option B : Depuis Supabase SQL Editor**

```sql
-- Appeler l'Edge Function pour chaque rapport existant
-- Note: Nécessite pg_net
SELECT net.http_post(
  url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/index-rapport',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY'
  ),
  body := jsonb_build_object('rapport_id', id)
)
FROM rapports;
```

---

## 8️⃣ Logs et monitoring

### Voir les logs des Edge Functions

```bash
# Logs en temps réel
supabase functions logs index-rapport --follow
supabase functions logs rag-query --follow
```

### Dans le dashboard Supabase
1. Aller dans **Edge Functions**
2. Cliquer sur la fonction
3. Onglet **Logs**

---

## ✅ Checklist de déploiement

- [ ] Dossiers créés (`index-rapport`, `rag-query`, `shared`)
- [ ] Fichiers TypeScript créés
- [ ] `OPENAI_API_KEY` configuré
- [ ] Edge Functions déployées
- [ ] Tests réussis (curl ou Postman)
- [ ] Rapports existants indexés
- [ ] Logs vérifiés

---

## 🐛 Troubleshooting

### Erreur : "vector extension not found"
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Erreur : "search_rapport_chunks does not exist"
Exécuter le fichier `supabase_rag_setup.sql`

### Erreur : "OpenAI API error"
Vérifier que `OPENAI_API_KEY` est bien configuré :
```bash
supabase secrets list
```

### Erreur : "Client not found"
Vérifier que le `user_id` existe dans la table `clients`

---

## 🎉 C'est fait !

Une fois tout déployé, ton RAG chatbot sera fonctionnel ! 🚀

Les utilisateurs pourront interroger leur historique de veilles et obtenir des réponses intelligentes basées sur leurs rapports.
