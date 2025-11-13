import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Charger les variables d'environnement depuis .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Erreur : Les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définies dans le fichier .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function indexAllReports() {
  console.log('🚀 Démarrage de l\'indexation des rapports existants...\n');

  try {
    // Récupérer tous les rapports
    const { data: rapports, error } = await supabase
      .from('rapports')
      .select('id, titre, date_rapport')
      .order('date_rapport', { ascending: false });

    if (error) {
      console.error('❌ Erreur lors de la récupération des rapports:', error);
      return;
    }

    if (!rapports || rapports.length === 0) {
      console.log('ℹ️  Aucun rapport à indexer');
      return;
    }

    console.log(`📊 ${rapports.length} rapports trouvés\n`);

    let successCount = 0;
    let errorCount = 0;

    // Indexer chaque rapport
    for (let i = 0; i < rapports.length; i++) {
      const rapport = rapports[i];
      const progress = `[${i + 1}/${rapports.length}]`;

      console.log(`${progress} Indexation : ${rapport.titre}`);
      console.log(`    Date : ${new Date(rapport.date_rapport).toLocaleDateString('fr-FR')}`);

      try {
        const { data, error } = await supabase.functions.invoke('index-rapport', {
          body: { rapport_id: rapport.id }
        });

        if (error) {
          console.error(`    ❌ Erreur:`, error.message);
          errorCount++;
        } else {
          console.log(`    ✅ ${data.chunks_created} chunks créés`);
          successCount++;
        }
      } catch (err) {
        console.error(`    ❌ Exception:`, err.message);
        errorCount++;
      }

      // Pause de 1 seconde entre chaque rapport pour éviter rate limits
      if (i < rapports.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(''); // Ligne vide pour la lisibilité
    }

    // Résumé
    console.log('═══════════════════════════════════════════════');
    console.log('🎉 Indexation terminée !');
    console.log(`✅ Succès : ${successCount}`);
    console.log(`❌ Erreurs : ${errorCount}`);
    console.log('═══════════════════════════════════════════════\n');

    // Vérifier le résultat dans la base
    const { count } = await supabase
      .from('rapport_chunks')
      .select('*', { count: 'exact', head: true });

    console.log(`📦 Total de chunks dans la base : ${count}`);
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
  }
}

// Exécuter
console.log('═══════════════════════════════════════════════');
console.log('  Indexation des rapports pour le RAG');
console.log('═══════════════════════════════════════════════\n');

indexAllReports();
