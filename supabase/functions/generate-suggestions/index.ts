// Edge Function Supabase pour générer des suggestions avec OpenAI
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { etape, secteur, contexte, user_id } = await req.json()

    // Vérifier que l'étape nécessite des suggestions
    const etapesAvecSuggestions = [
      'produits_services',
      'concurrents',
      'sources',
      'frequence',
      'canaux'
    ]

    if (!etapesAvecSuggestions.includes(etape)) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Suggestions fixes pour certaines étapes
    if (etape === 'frequence') {
      return new Response(
        JSON.stringify({
          suggestions: [
            { label: 'Quotidienne', value: 'quotidienne', description: 'Tous les jours' },
            { label: 'Hebdomadaire', value: 'hebdomadaire', description: 'Chaque semaine' },
            { label: 'Mensuelle', value: 'mensuelle', description: 'Chaque mois' }
          ]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (etape === 'canaux') {
      return new Response(
        JSON.stringify({
          suggestions: [
            { label: 'Email (PDF)', value: 'Email', icon: 'mail', format: 'pdf' },
            { label: 'Email (PDF + Audio)', value: 'Email', icon: 'mail', format: 'pdf_audio' },
            { label: 'WhatsApp (PDF)', value: 'WhatsApp', icon: 'message-circle', format: 'pdf' },
            { label: 'WhatsApp (PDF + Audio)', value: 'WhatsApp', icon: 'message-circle', format: 'pdf_audio' },
            { label: 'Slack (PDF)', value: 'Slack', icon: 'slack', format: 'pdf' },
            { label: 'Slack (PDF + Audio)', value: 'Slack', icon: 'slack', format: 'pdf_audio' }
          ]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Pour les autres étapes, utiliser OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    // Créer le prompt selon l'étape
    let prompt = ''
    let systemPrompt = 'Tu es un assistant expert en veille concurrentielle et intelligence économique.'

    switch (etape) {
      case 'produits_services':
        prompt = `Secteur d'activité : ${secteur}
Contexte : ${contexte || 'Startup en phase de croissance'}

Génère 5 suggestions de produits ou services à surveiller dans ce secteur.
Retourne un JSON array avec : [{"label": "Nom du produit/service", "value": "nom_normalise", "description": "Courte description"}]`
        break

      case 'concurrents':
        prompt = `Secteur d'activité : ${secteur}
Contexte : ${contexte || 'Entreprise cherchant à surveiller son marché'}

Génère 5 suggestions de concurrents majeurs dans ce secteur (entreprises connues).
Retourne un JSON array avec : [{"label": "Nom de l'entreprise", "value": "nom_entreprise", "description": "Pourquoi surveiller"}]`
        break

      case 'sources':
        prompt = `Secteur d'activité : ${secteur}
Contexte : ${contexte || 'Besoin de sources d\'information fiables'}

Génère 4 suggestions de sources d'information pertinentes (blogs, médias, sites spécialisés) pour ce secteur.
Retourne un JSON array avec : [{"label": "Nom de la source", "value": "url_ou_nom", "description": "Type de contenu"}]`
        break

      default:
        prompt = 'Génère des suggestions génériques.'
    }

    // Appel à OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" }
      }),
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text()
      console.error('OpenAI API error:', error)
      throw new Error('Failed to generate suggestions')
    }

    const data = await openaiResponse.json()
    const content = data.choices[0].message.content

    let suggestions = []
    try {
      const parsed = JSON.parse(content)
      suggestions = parsed.suggestions || parsed.items || []
    } catch (e) {
      console.error('Failed to parse OpenAI response:', content)
      suggestions = []
    }

    // Limiter à 5 suggestions maximum
    suggestions = suggestions.slice(0, 5)

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message, suggestions: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

