/**
 * Script de diagnostic pour vérifier le statut du système RAG
 *
 * Ce script vérifie :
 * 1. Si les tables RAG existent dans Supabase
 * 2. Si des rapports existent
 * 3. Si des chunks sont indexés
 * 4. Si les Edge Functions sont accessibles
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRAGStatus() {
  console.log('🔍 Diagnostic du système RAG\n');
  console.log('='.repeat(50));

  // 1. Vérifier si la table rapport_chunks existe
  console.log('\n📊 1. Vérification de la table rapport_chunks...');
  try {
    const { data, error } = await supabase
      .from('rapport_chunks')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ La table rapport_chunks n\'existe PAS !');
      console.error('   Erreur:', error.message);
      console.log('\n💡 Solution: Exécutez le fichier supabase_rag_setup.sql dans Supabase SQL Editor');
      return;
    } else {
      console.log('✅ La table rapport_chunks existe');
    }
  } catch (err: any) {
    console.error('❌ Erreur lors de la vérification:', err.message);
    return;
  }

  // 2. Compter les rapports
  console.log('\n📄 2. Vérification des rapports...');
  const { count: rapportCount, error: rapportError } = await supabase
    .from('rapports')
    .select('*', { count: 'exact', head: true });

  if (rapportError) {
    console.error('❌ Erreur:', rapportError.message);
  } else {
    console.log(`✅ Nombre de rapports: ${rapportCount}`);
    if (rapportCount === 0) {
      console.log('⚠️  Aucun rapport trouvé. Vous devez d\'abord générer des rapports !');
      return;
    }
  }

  // 3. Compter les chunks indexés
  console.log('\n📚 3. Vérification des chunks indexés...');
  const { count: chunkCount, error: chunkError } = await supabase
    .from('rapport_chunks')
    .select('*', { count: 'exact', head: true });

  if (chunkError) {
    console.error('❌ Erreur:', chunkError.message);
  } else {
    console.log(`✅ Nombre de chunks: ${chunkCount}`);
    if (chunkCount === 0) {
      console.log('⚠️  Aucun chunk indexé !');
      console.log('\n💡 Solution: Les rapports doivent être indexés');
      console.log('   - Option 1: Attendez que l\'auto-indexation se lance (toutes les 2 min)');
      console.log('   - Option 2: Indexez manuellement via n8n ou Edge Function');
    } else {
      console.log(`✅ ${chunkCount} chunks prêts pour la recherche !`);
    }
  }

  // 4. Vérifier un rapport spécifique
  console.log('\n🔎 4. Détails des rapports...');
  const { data: rapports, error: rapportsError } = await supabase
    .from('rapports')
    .select('id, titre, date_generation, indexe_rag')
    .order('date_generation', { ascending: false })
    .limit(5);

  if (rapportsError) {
    console.error('❌ Erreur:', rapportsError.message);
  } else {
    console.log('Derniers rapports:');
    rapports?.forEach((r, idx) => {
      const status = r.indexe_rag ? '✅ Indexé' : '❌ Non indexé';
      console.log(`  ${idx + 1}. ${r.titre} - ${status}`);
    });
  }

  // 5. Tester la fonction search_rapport_chunks
  console.log('\n🔧 5. Test de la fonction search_rapport_chunks...');
  try {
    const { data, error } = await supabase
      .rpc('search_rapport_chunks', {
        query_embedding: new Array(1536).fill(0), // Vecteur factice pour tester
        user_client_id: '00000000-0000-0000-0000-000000000000',
        match_threshold: 0.5,
        match_count: 1
      });

    if (error) {
      console.error('❌ La fonction search_rapport_chunks n\'existe PAS !');
      console.error('   Erreur:', error.message);
      console.log('\n💡 Solution: Exécutez le fichier supabase_rag_setup.sql');
    } else {
      console.log('✅ La fonction search_rapport_chunks fonctionne');
    }
  } catch (err: any) {
    console.error('❌ Erreur:', err.message);
  }

  // 6. Tester les Edge Functions
  console.log('\n🚀 6. Test des Edge Functions...');

  // Test rag-query
  console.log('   Testing rag-query...');
  try {
    const { data, error } = await supabase.functions.invoke('rag-query', {
      body: { question: 'test', user_id: 'test' }
    });

    if (error) {
      console.error('   ❌ rag-query non accessible:', error.message);
      console.log('   💡 Solution: Déployez les Edge Functions avec: cd supabase/functions && supabase functions deploy');
    } else {
      console.log('   ✅ rag-query accessible');
    }
  } catch (err: any) {
    console.error('   ❌ rag-query erreur:', err.message);
  }

  // Test index-rapport
  console.log('   Testing index-rapport...');
  try {
    const { data, error } = await supabase.functions.invoke('index-rapport', {
      body: { rapport_id: 'test' }
    });

    if (error && !error.message.includes('rapport_id')) {
      console.error('   ❌ index-rapport non accessible:', error.message);
    } else {
      console.log('   ✅ index-rapport accessible');
    }
  } catch (err: any) {
    console.error('   ❌ index-rapport erreur:', err.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Diagnostic terminé !');
  console.log('\n📋 Prochaines étapes recommandées:');
  console.log('1. Si tables manquantes → Exécutez supabase_rag_setup.sql');
  console.log('2. Si Edge Functions manquantes → Déployez-les');
  console.log('3. Si rapports non indexés → Lancez l\'indexation');
  console.log('4. Configurez OPENAI_API_KEY dans Supabase Edge Function Secrets');
}

checkRAGStatus().catch(console.error);
