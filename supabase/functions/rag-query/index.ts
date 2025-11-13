/**
 * Edge Function: rag-query (Version avec Mémoire Conversationnelle)
 *
 * Fonctionnalités:
 * - Recherche sémantique dans les rapports indexés
 * - Mémoire conversationnelle (historique des messages)
 * - Support des clarifications et questions de suivi
 * - Sauvegarde automatique de l'historique
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Fonction pour créer un embedding avec OpenAI
async function createEmbedding(text: string): Promise<number[]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

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

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const { question, user_id, conversation_id } = await req.json();

    if (!question || !user_id) {
      throw new Error('question and user_id are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`🔍 Query from user: ${user_id}`);
    console.log(`❓ Question: ${question}`);
    console.log(`💬 Conversation ID: ${conversation_id || 'New conversation'}`);

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

    // 2. Gérer la conversation (créer ou récupérer)
    let currentConversationId = conversation_id;
    let conversationHistory: Message[] = [];

    if (conversation_id) {
      // Récupérer l'historique de la conversation
      console.log('📜 Fetching conversation history...');
      const { data: history, error: historyError } = await supabase
        .rpc('get_conversation_history', {
          p_conversation_id: conversation_id,
          p_limit: 10
        });

      if (!historyError && history) {
        conversationHistory = history.map((msg: any) => ({
          role: msg.role,
          content: msg.content
        }));
        console.log(`📚 Found ${conversationHistory.length} previous messages`);
      }
    } else {
      // Créer une nouvelle conversation
      console.log('🆕 Creating new conversation...');
      const { data: newConvId, error: convError } = await supabase
        .rpc('create_conversation', {
          p_user_id: user_id,
          p_client_id: client.id,
          p_titre: null  // Sera généré automatiquement
        });

      if (convError) {
        console.error('Error creating conversation:', convError);
        throw convError;
      }

      currentConversationId = newConvId;
      console.log(`✅ New conversation created: ${currentConversationId}`);
    }

    // 3. Créer l'embedding de la question
    console.log('🔄 Creating question embedding...');
    const questionEmbedding = await createEmbedding(question);

    // 4. Rechercher les chunks similaires
    console.log('🔎 Searching similar chunks...');
    const { data: chunks, error: searchError } = await supabase
      .rpc('search_rapport_chunks', {
        query_embedding: questionEmbedding,
        user_client_id: client.id,
        match_threshold: 0.3,
        match_count: 15
      });

    if (searchError) {
      console.error('Search error:', searchError);
      throw searchError;
    }

    console.log(`📚 Found ${chunks?.length || 0} relevant chunks`);

    // Logger les scores de similarité
    if (chunks && chunks.length > 0) {
      console.log('📊 Similarity scores:');
      chunks.forEach((chunk, i) => {
        console.log(`  ${i + 1}. Score: ${chunk.similarity?.toFixed(3) || 'N/A'} - ${chunk.metadata?.titre || 'Sans titre'}`);
      });
    }

    // 5. Construire le contexte pour GPT
    const context = chunks && chunks.length > 0
      ? chunks
          .map(chunk =>
            `[${chunk.metadata.titre} - ${new Date(chunk.metadata.date_rapport).toLocaleDateString('fr-FR')}]\n${chunk.chunk_text}`
          )
          .join('\n\n---\n\n')
      : '';

    console.log(`📝 Context length: ${context.length} characters`);

    // 6. Construire les messages pour GPT avec historique
    const messages: Message[] = [
      {
        role: 'system',
        content: `Tu es un assistant spécialisé dans l'analyse de veilles concurrentielles et technologiques.

**Sources d'information** :
1. Contexte actuel : Extraits de rapports de veille fournis avec chaque question
2. Historique de conversation : Tes réponses précédentes et les questions de l'utilisateur

**Instructions** :
- Pour les nouvelles questions : Base-toi sur le contexte fourni (extraits de rapports)
- Pour les questions de suivi (ex: "et la deuxième ?", "détaille ça", "explique plus") :
  * Utilise l'historique de conversation pour comprendre la référence
  * Base-toi sur tes réponses précédentes pour répondre
  * Tu peux approfondir ou clarifier ce que tu as déjà dit
- Cite les sources (titres des rapports et dates) pour les nouvelles informations
- Réponds de manière claire, structurée et professionnelle
- Utilise des bullet points pour les listes
- Sois concis mais complet
- Si tu ne peux pas répondre avec les informations disponibles, dis-le clairement`
      }
    ];

    // Ajouter l'historique (sauf le message actuel)
    if (conversationHistory.length > 0) {
      console.log('📖 Including conversation history in prompt');
      messages.push(...conversationHistory);
    }

    // Ajouter la question actuelle avec le contexte
    let userMessage: string;

    if (context.length > 0) {
      // Il y a du contexte pertinent trouvé
      userMessage = `Contexte (extraits de rapports de veille) :\n\n${context}\n\n---\n\nQuestion : ${question}`;
    } else if (conversationHistory.length > 0) {
      // Pas de contexte, mais il y a de l'historique (probablement une question de suivi)
      userMessage = `Question : ${question}\n\n(Note : Cette question semble être une question de suivi. Aucun nouveau contexte trouvé dans les rapports. Réfère-toi à l'historique de notre conversation ci-dessus pour répondre.)`;
    } else {
      // Ni contexte ni historique
      userMessage = `Question : ${question}\n\n(Note : Aucun contexte pertinent trouvé dans les rapports pour cette question.)`;
    }

    messages.push({
      role: 'user',
      content: userMessage
    });

    // 7. Générer la réponse avec GPT
    console.log('🤖 Generating answer with GPT-4...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',  // Moins cher et rapide
        messages: messages,
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

    // 8. Sauvegarder la question et la réponse dans la base de données
    console.log('💾 Saving messages to database...');

    // Sauvegarder la question
    await supabase.rpc('add_message', {
      p_conversation_id: currentConversationId,
      p_role: 'user',
      p_content: question,
      p_metadata: {
        chunks_found: chunks?.length || 0,
        timestamp: new Date().toISOString()
      }
    });

    // Sauvegarder la réponse
    await supabase.rpc('add_message', {
      p_conversation_id: currentConversationId,
      p_role: 'assistant',
      p_content: answer,
      p_metadata: {
        model: 'gpt-4o-mini',
        sources_count: chunks?.length || 0,
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Messages saved');

    // 9. Retourner la réponse avec conversation_id
    return new Response(
      JSON.stringify({
        answer,
        conversation_id: currentConversationId,
        sources: chunks && chunks.length > 0
          ? chunks.slice(0, 5).map(c => ({
              titre: c.metadata.titre,
              date: c.metadata.date_rapport,
              excerpt: c.chunk_text.substring(0, 200) + '...',
              similarity: c.similarity
            }))
          : [],
        has_history: conversationHistory.length > 0
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
