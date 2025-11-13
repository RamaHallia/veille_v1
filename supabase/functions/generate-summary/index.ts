import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    const { rapport_id } = await req.json()

    console.log('📊 Génération du résumé pour rapport:', rapport_id)

    // 1. Récupérer les infos du rapport
    const { data: rapport, error: rapportError } = await supabaseClient
      .from('rapports')
      .select('*')
      .eq('id', rapport_id)
      .single()

    if (rapportError) {
      throw new Error(`Erreur récupération rapport: ${rapportError.message}`)
    }

    if (!rapport.pdf_url) {
      throw new Error('Aucun PDF associé à ce rapport')
    }

    console.log('📄 PDF URL:', rapport.pdf_url)

    // 2. Télécharger le PDF depuis Supabase Storage
    const pdfPath = rapport.pdf_url.replace(/^.*\/storage\/v1\/object\/public\/[^/]+\//, '')

    const { data: pdfData, error: downloadError } = await supabaseClient
      .storage
      .from('rapports')
      .download(pdfPath)

    if (downloadError) {
      console.error('Erreur téléchargement PDF:', downloadError)
      throw new Error(`Erreur téléchargement PDF: ${downloadError.message}`)
    }

    console.log('✅ PDF téléchargé, taille:', pdfData.size)

    // 3. Lire le contenu du PDF (simplifié - en production, utilisez pdf-parse)
    // Pour l'instant, on va générer un résumé basé sur les métadonnées
    const metadata = {
      titre: rapport.titre,
      secteur: rapport.secteur,
      mots_cles: rapport.mots_cles,
      nb_sources: rapport.nb_sources,
      type_rapport: rapport.type_rapport,
      date: new Date(rapport.date_generation).toLocaleDateString('fr-FR')
    }

    // 4. Générer le résumé avec OpenAI GPT-4
    const prompt = `Tu es un assistant qui génère des résumés concis de rapports de veille concurrentielle.

Voici les informations du rapport :
- Titre : ${metadata.titre}
- Secteur : ${metadata.secteur}
- Mots-clés : ${metadata.mots_cles?.join(', ') || 'N/A'}
- Sources analysées : ${metadata.nb_sources}
- Type : ${metadata.type_rapport}
- Date : ${metadata.date}

Génère un résumé court et percutant (2-3 phrases maximum, 150 caractères max) qui donne envie de lire le rapport complet. Le résumé doit être informatif et professionnel.

Format : Un seul paragraphe court, sans titre.`

    console.log('🤖 Appel OpenAI API...')

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview', // GPT-4.1 = gpt-4-turbo-preview
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en synthèse de rapports de veille. Tu génères des résumés courts et percutants.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`)
    }

    const openaiData = await openaiResponse.json()
    const resume = openaiData.choices[0].message.content.trim()

    console.log('✅ Résumé généré:', resume)

    // 5. Sauvegarder le résumé dans la table rapports
    const { error: updateError } = await supabaseClient
      .from('rapports')
      .update({ resume })
      .eq('id', rapport_id)

    if (updateError) {
      throw new Error(`Erreur sauvegarde résumé: ${updateError.message}`)
    }

    console.log('💾 Résumé sauvegardé dans la base')

    return new Response(
      JSON.stringify({
        success: true,
        resume,
        rapport_id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('❌ Erreur:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
