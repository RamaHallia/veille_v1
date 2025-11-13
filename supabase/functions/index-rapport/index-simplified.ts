/**
 * Edge Function : index-rapport (Version Simplifiée - RECOMMANDÉE)
 *
 * Stratégie d'indexation intelligente :
 * 1. Priorité 1 : contenu_html (contenu complet déjà extrait)
 * 2. Priorité 2 : resume (résumé si pas de HTML)
 * 3. Future : Extraction PDF (si vraiment nécessaire)
 *
 * Cette version est SIMPLE, RAPIDE et FIABLE
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      model: 'text-embedding-3-small',  // ✅ 1536 dimensions
      input: text
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Fonction pour nettoyer le HTML et extraire le texte
function cleanHTML(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gis, '') // Retirer les styles
    .replace(/<script[^>]*>.*?<\/script>/gis, '') // Retirer les scripts
    .replace(/<[^>]+>/g, ' ') // Retirer toutes les balises HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ') // Normaliser les espaces
    .trim();
}

// Fonction pour découper le texte en chunks
function chunkText(text: string, maxTokens: number = 500): string[] {
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders
    });
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

    // 1. Récupérer le rapport avec toutes les infos
    const { data: rapport, error: rapportError } = await supabase
      .from('rapports')
      .select('*, clients(id, secteur)')
      .eq('id', rapport_id)
      .single();

    if (rapportError) {
      console.error('Error fetching rapport:', rapportError);
      throw rapportError;
    }

    console.log(`📄 Rapport trouvé: ${rapport.titre}`);
    console.log(`  - contenu_html: ${rapport.contenu_html ? rapport.contenu_html.length : 0} chars`);
    console.log(`  - resume: ${rapport.resume ? rapport.resume.length : 0} chars`);
    console.log(`  - pdf_url: ${rapport.pdf_url ? 'Oui' : 'Non'}`);

    let contentToIndex = '';
    let contentSource = '';

    // STRATÉGIE D'INDEXATION INTELLIGENTE

    // Priorité 1 : contenu_html (le plus complet)
    if (rapport.contenu_html && rapport.contenu_html.trim().length > 100) {
      console.log('✅ Source: contenu_html (contenu complet)');
      contentToIndex = cleanHTML(rapport.contenu_html);
      contentSource = 'contenu_html';
    }
    // Priorité 2 : resume (si pas de HTML)
    else if (rapport.resume && rapport.resume.trim().length > 100) {
      console.log('⚠️ Source: resume (contenu partiel)');
      contentToIndex = rapport.resume;
      contentSource = 'resume';
    }
    // Aucun contenu disponible
    else {
      console.warn('❌ Aucun contenu disponible pour indexation');
      return new Response(
        JSON.stringify({
          success: false,
          chunks_created: 0,
          message: 'Aucun contenu disponible (ni contenu_html, ni resume)',
          rapport_id: rapport_id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📄 Contenu à indexer: ${contentToIndex.length} caractères`);

    // 2. Enrichir le contenu avec les métadonnées
    let enrichedContent = `Titre: ${rapport.titre}\n\n`;

    if (rapport.secteur) {
      enrichedContent += `Secteur: ${rapport.secteur}\n\n`;
    }

    if (rapport.mots_cles && rapport.mots_cles.length > 0) {
      enrichedContent += `Mots-clés: ${rapport.mots_cles.join(', ')}\n\n`;
    }

    if (rapport.type_rapport) {
      enrichedContent += `Type: ${rapport.type_rapport}\n\n`;
    }

    enrichedContent += `Contenu:\n${contentToIndex}`;

    console.log(`📄 Contenu enrichi: ${enrichedContent.length} caractères`);

    // 3. Découper en chunks
    const chunks = chunkText(enrichedContent, 500);
    console.log(`✂️ Créé ${chunks.length} chunks`);

    if (chunks.length === 0) {
      console.warn('Aucun chunk valide créé');
      return new Response(
        JSON.stringify({
          success: true,
          chunks_created: 0,
          message: 'Contenu trop court, aucun chunk créé',
          content_source: contentSource
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Créer les embeddings pour chaque chunk
    console.log('🔄 Création des embeddings avec OpenAI...');
    const embeddings = await Promise.all(
      chunks.map(async (chunk, idx) => {
        console.log(`  Embedding ${idx + 1}/${chunks.length}...`);
        return await createEmbedding(chunk);
      })
    );

    console.log('✅ Tous les embeddings créés');

    // 5. Supprimer les anciens chunks de ce rapport (si réindexation)
    console.log('🗑️ Suppression des anciens chunks...');
    await supabase
      .from('rapport_chunks')
      .delete()
      .eq('rapport_id', rapport_id);

    // 6. Insérer les nouveaux chunks
    console.log('💾 Insertion des nouveaux chunks...');
    const chunksToInsert = chunks.map((chunk, idx) => ({
      rapport_id: rapport.id,
      client_id: rapport.client_id,
      chunk_text: chunk,
      chunk_index: idx,
      embedding: embeddings[idx],
      metadata: {
        titre: rapport.titre,
        date_generation: rapport.date_generation,
        secteur: rapport.clients?.secteur || rapport.secteur || null,
        type_rapport: rapport.type_rapport,
        nb_sources: rapport.nb_sources,
        mots_cles: rapport.mots_cles || [],
        pdf_url: rapport.pdf_url,
        content_source: contentSource
      }
    }));

    const { error: insertError } = await supabase
      .from('rapport_chunks')
      .insert(chunksToInsert);

    if (insertError) {
      console.error('Error inserting chunks:', insertError);
      throw insertError;
    }

    // 7. Marquer le rapport comme indexé
    console.log('✅ Marquage du rapport comme indexé...');
    await supabase
      .from('rapports')
      .update({
        indexe_rag: true,
        date_indexation: new Date().toISOString()
      })
      .eq('id', rapport_id);

    console.log(`🎉 Indexation terminée avec succès !`);
    console.log(`   - Rapport: ${rapport.titre}`);
    console.log(`   - Chunks créés: ${chunks.length}`);
    console.log(`   - Source: ${contentSource}`);
    console.log(`   - Taille totale: ${contentToIndex.length} caractères`);

    return new Response(
      JSON.stringify({
        success: true,
        chunks_created: chunks.length,
        rapport_id: rapport_id,
        content_source: contentSource,
        content_length: contentToIndex.length,
        titre: rapport.titre
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
