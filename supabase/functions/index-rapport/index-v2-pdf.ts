/**
 * Edge Function : index-rapport (Version 2 - Extraction PDF)
 *
 * Cette version télécharge le PDF depuis pdf_url et extrait le texte
 * pour créer les chunks et embeddings RAG
 *
 * Utilise pdf-parse via esm.sh pour Deno
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

// Fonction pour extraire le texte d'un PDF depuis une URL
async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  console.log(`📄 Téléchargement du PDF: ${pdfUrl}`);

  // Télécharger le PDF
  const pdfResponse = await fetch(pdfUrl);

  if (!pdfResponse.ok) {
    throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`);
  }

  const pdfBuffer = await pdfResponse.arrayBuffer();
  console.log(`📦 PDF téléchargé: ${pdfBuffer.byteLength} bytes`);

  // Option 1 : Utiliser une API externe pour extraire le texte
  // C'est plus fiable que de parser le PDF nous-mêmes
  const extractionApiKey = Deno.env.get('PDF_EXTRACTION_API_KEY');

  if (extractionApiKey) {
    // Utiliser PDFCo API ou similaire
    console.log('🔧 Extraction via API externe...');

    const formData = new FormData();
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }));

    const extractResponse = await fetch('https://api.pdf.co/v1/pdf/convert/to/text', {
      method: 'POST',
      headers: {
        'x-api-key': extractionApiKey
      },
      body: formData
    });

    if (extractResponse.ok) {
      const result = await extractResponse.json();
      return result.body; // Le texte extrait
    }
  }

  // Option 2 : Extraction basique avec RegEx
  // Note: Cette méthode est limitée, ne fonctionne que pour les PDF simples
  console.log('⚠️ Extraction basique (peut être imprécise)...');

  const pdfText = new TextDecoder().decode(pdfBuffer);

  // Extraire le texte entre les balises de contenu PDF
  const textMatches = pdfText.match(/\(([^)]+)\)/g);

  if (textMatches) {
    const extractedText = textMatches
      .map(match => match.slice(1, -1)) // Retirer les parenthèses
      .join(' ')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\\/g, '');

    return extractedText;
  }

  throw new Error('Unable to extract text from PDF');
}

// Fonction pour découper le texte en chunks
function chunkText(text: string, maxTokens: number = 500): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 0);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
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

  return chunks.filter(c => c.length >= 50);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
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

    // Récupérer le rapport
    const { data: rapport, error: rapportError } = await supabase
      .from('rapports')
      .select('*, clients(id, secteur)')
      .eq('id', rapport_id)
      .single();

    if (rapportError) {
      console.error('Error fetching rapport:', rapportError);
      throw rapportError;
    }

    let contentToIndex = '';

    // PRIORITÉ 1 : Utiliser contenu_html s'il existe (déjà extrait)
    if (rapport.contenu_html && rapport.contenu_html.trim().length > 100) {
      console.log('✅ Utilisation de contenu_html (déjà extrait)');

      // Nettoyer le HTML
      contentToIndex = rapport.contenu_html
        .replace(/<[^>]*>/g, ' ')  // Retirer les balises HTML
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
    }
    // PRIORITÉ 2 : Télécharger et extraire le PDF
    else if (rapport.pdf_url && rapport.pdf_url.trim().length > 0) {
      console.log('📄 Extraction du PDF depuis pdf_url');

      try {
        contentToIndex = await extractTextFromPDF(rapport.pdf_url);
      } catch (error) {
        console.error('Erreur extraction PDF:', error);

        // Fallback sur le résumé si disponible
        if (rapport.resume && rapport.resume.trim().length > 100) {
          console.log('⚠️ Fallback: Utilisation du résumé');
          contentToIndex = rapport.resume;
        } else {
          throw new Error('Impossible d\'extraire le contenu du PDF et pas de résumé disponible');
        }
      }
    }
    // PRIORITÉ 3 : Utiliser le résumé en dernier recours
    else if (rapport.resume && rapport.resume.trim().length > 100) {
      console.log('ℹ️ Utilisation du résumé');
      contentToIndex = rapport.resume;
    }
    else {
      console.warn('Aucun contenu à indexer');
      return new Response(
        JSON.stringify({ success: true, chunks_created: 0, message: 'No content to index' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📄 Contenu à indexer: ${contentToIndex.length} caractères`);

    // Enrichir avec métadonnées
    let enrichedContent = `Titre: ${rapport.titre}\n\n`;

    if (rapport.secteur) {
      enrichedContent += `Secteur: ${rapport.secteur}\n\n`;
    }

    if (rapport.mots_cles && rapport.mots_cles.length > 0) {
      enrichedContent += `Mots-clés: ${rapport.mots_cles.join(', ')}\n\n`;
    }

    enrichedContent += `Contenu:\n${contentToIndex}`;

    // Découper en chunks
    const chunks = chunkText(enrichedContent, 500);
    console.log(`✂️ Créé ${chunks.length} chunks`);

    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, chunks_created: 0, message: 'No valid chunks' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Créer les embeddings
    console.log('🔄 Création des embeddings...');
    const embeddings = await Promise.all(
      chunks.map(async (chunk, idx) => {
        console.log(`  Embedding ${idx + 1}/${chunks.length}`);
        return await createEmbedding(chunk);
      })
    );

    console.log('✅ Embeddings créés');

    // Supprimer les anciens chunks
    await supabase
      .from('rapport_chunks')
      .delete()
      .eq('rapport_id', rapport_id);

    // Insérer les nouveaux chunks
    const chunksToInsert = chunks.map((chunk, idx) => ({
      rapport_id: rapport.id,
      client_id: rapport.client_id,
      chunk_text: chunk,
      chunk_index: idx,
      embedding: embeddings[idx],
      metadata: {
        titre: rapport.titre,
        date_generation: rapport.date_generation,
        secteur: rapport.clients?.secteur || null,
        pdf_url: rapport.pdf_url,
        type_rapport: rapport.type_rapport,
        nb_sources: rapport.nb_sources
      }
    }));

    const { error: insertError } = await supabase
      .from('rapport_chunks')
      .insert(chunksToInsert);

    if (insertError) {
      console.error('Error inserting chunks:', insertError);
      throw insertError;
    }

    // Marquer comme indexé
    await supabase
      .from('rapports')
      .update({
        indexe_rag: true,
        date_indexation: new Date().toISOString()
      })
      .eq('id', rapport_id);

    console.log(`✅ Successfully indexed ${chunks.length} chunks for rapport ${rapport_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        chunks_created: chunks.length,
        rapport_id: rapport_id,
        content_source: rapport.contenu_html ? 'html' : rapport.pdf_url ? 'pdf' : 'resume',
        content_length: contentToIndex.length
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
