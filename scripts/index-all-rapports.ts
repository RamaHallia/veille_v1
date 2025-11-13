/**
 * Script pour indexer automatiquement tous les rapports non indexés
 *
 * Usage :
 *   npx tsx scripts/index-all-rapports.ts
 *
 * Ce script :
 * 1. Récupère tous les rapports non indexés
 * 2. Appelle l'Edge Function index-rapport pour chacun
 * 3. Affiche la progression en temps réel
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const BATCH_SIZE = 5; // Indexer 5 rapports à la fois
const DELAY_BETWEEN_BATCHES = 2000; // 2 secondes entre chaque batch
const DELAY_BETWEEN_REPORTS = 500; // 500ms entre chaque rapport

async function indexAllRapports() {
  console.log('🚀 Indexation automatique des rapports\n');
  console.log('='.repeat(60));

  // 1. Récupérer les rapports non indexés
  console.log('\n📊 Récupération des rapports...');

  const { data: rapports, error } = await supabase
    .from('rapports')
    .select('id, titre, date_generation, contenu_html, resume')
    .or('indexe_rag.is.null,indexe_rag.eq.false')
    .order('date_generation', { ascending: false });

  if (error) {
    console.error('❌ Erreur lors de la récupération:', error.message);
    return;
  }

  if (!rapports || rapports.length === 0) {
    console.log('✅ Tous les rapports sont déjà indexés !');
    return;
  }

  console.log(`📋 ${rapports.length} rapports à indexer\n`);

  // Vérifier que les rapports ont du contenu (HTML ou résumé)
  const rapportsWithHTML = rapports.filter(r => r.contenu_html && r.contenu_html.length > 100);
  const rapportsWithResume = rapports.filter(r => r.resume && r.resume.length > 50);
  const rapportsReady = rapports.filter(r =>
    (r.contenu_html && r.contenu_html.length > 100) ||
    (r.resume && r.resume.length > 50)
  );

  console.log(`📝 ${rapportsWithHTML.length} rapports avec contenu HTML`);
  console.log(`📋 ${rapportsWithResume.length} rapports avec résumé`);
  console.log(`✅ ${rapportsReady.length} rapports prêts à indexer\n`);

  if (rapportsReady.length === 0) {
    console.log('\n❌ Aucun rapport prêt à indexer.');
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('🔄 Indexation en cours...\n');

  // 2. Indexer les rapports par batch
  let totalIndexed = 0;
  let totalChunks = 0;
  let totalErrors = 0;

  const batches = [];
  for (let i = 0; i < rapportsReady.length; i += BATCH_SIZE) {
    batches.push(rapportsReady.slice(i, i + BATCH_SIZE));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`📦 Batch ${batchIndex + 1}/${batches.length} (${batch.length} rapports)`);

    for (let i = 0; i < batch.length; i++) {
      const rapport = batch[i];
      const globalIndex = batchIndex * BATCH_SIZE + i + 1;

      process.stdout.write(
        `  [${globalIndex}/${rapportsReady.length}] ${rapport.titre.substring(0, 40)}... `
      );

      try {
        const { data, error } = await supabase.functions.invoke('index-rapport', {
          body: { rapport_id: rapport.id }
        });

        if (error) {
          console.log(`❌`);
          console.log(`      Erreur: ${error.message}`);
          totalErrors++;
        } else if (data.chunks_created === 0) {
          console.log(`⚠️  (0 chunks)`);
        } else {
          console.log(`✅ (${data.chunks_created} chunks)`);
          totalIndexed++;
          totalChunks += data.chunks_created;
        }
      } catch (err: any) {
        console.log(`❌`);
        console.log(`      Erreur: ${err.message}`);
        totalErrors++;
      }

      // Pause entre chaque rapport
      if (i < batch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REPORTS));
      }
    }

    // Pause entre chaque batch
    if (batchIndex < batches.length - 1) {
      console.log(`  ⏸️  Pause de ${DELAY_BETWEEN_BATCHES / 1000}s...\n`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }

  // 3. Résumé
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ DE L\'INDEXATION\n');
  console.log(`✅ Rapports indexés : ${totalIndexed}/${rapportsReady.length}`);
  console.log(`📚 Chunks créés     : ${totalChunks}`);
  console.log(`❌ Erreurs          : ${totalErrors}`);

  if (totalIndexed > 0) {
    const avgChunks = (totalChunks / totalIndexed).toFixed(1);
    console.log(`📊 Moyenne          : ${avgChunks} chunks/rapport`);
  }

  console.log('\n' + '='.repeat(60));

  if (totalIndexed === rapportsReady.length) {
    console.log('🎉 TOUS LES RAPPORTS ONT ÉTÉ INDEXÉS AVEC SUCCÈS !');
  } else {
    console.log(`⚠️  ${rapportsReady.length - totalIndexed} rapports n'ont pas pu être indexés`);
    console.log('💡 Vérifiez les erreurs ci-dessus et relancez le script si nécessaire.');
  }

  // 4. Vérification finale
  console.log('\n🔍 Vérification finale...');

  const { count: totalChunksInDB } = await supabase
    .from('rapport_chunks')
    .select('*', { count: 'exact', head: true });

  console.log(`📚 Total de chunks dans la DB : ${totalChunksInDB}`);
  console.log('\n✅ Indexation terminée !');
  console.log('\n💡 Prochaine étape : Testez l\'Assistant IA !\n');
}

// Gestion des erreurs
indexAllRapports().catch((error) => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
