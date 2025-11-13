import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Composant invisible qui vérifie et indexe automatiquement
 * les rapports non indexés au démarrage de l'application
 */
export default function AutoIndexer() {
  const { user } = useAuth();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Ne vérifier qu'une seule fois par session
    if (!user || hasChecked) return;

    checkAndIndexReports();
    setHasChecked(true);
  }, [user, hasChecked]); // Ajout de hasChecked pour éviter les avertissements

  const checkAndIndexReports = async () => {
    try {
      console.log('🔍 Vérification des rapports non indexés...');

      // 1. Récupérer le client_id de l'utilisateur
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!clientData) {
        console.log('ℹ️ Aucun client trouvé pour cet utilisateur');
        return;
      }

      // 2. Récupérer tous les rapports NON INDEXÉS de ce client
      const { data: rapports, error: rapportsError } = await supabase
        .from('rapports')
        .select('id, titre, date_generation, resume')
        .eq('client_id', clientData.id)
        .or('indexe_rag.is.null,indexe_rag.eq.false')  // Seulement les rapports non indexés
        .order('date_generation', { ascending: false });

      if (rapportsError) {
        console.error('❌ Erreur lors de la récupération des rapports:', rapportsError);
        console.error('❌ Message:', rapportsError.message);
        console.error('❌ Details:', rapportsError.details);
        console.error('❌ Hint:', rapportsError.hint);
        console.error('❌ Code:', rapportsError.code);
        console.error('❌ Erreur complète (stringify):', JSON.stringify(rapportsError, null, 2));
        return;
      }

      if (!rapports || rapports.length === 0) {
        console.log('✅ Tous les rapports sont déjà indexés');
        return;
      }

      console.log(`📊 ${rapports.length} rapports trouvés`);

      // 3. Filtrer les rapports qui ont un résumé à indexer
      const rapportsWithResume = rapports.filter(
        rapport => rapport.resume && rapport.resume.trim().length > 0
      );

      const rapportsWithoutResume = rapports.length - rapportsWithResume.length;
      if (rapportsWithoutResume > 0) {
        console.log(`⚠️ ${rapportsWithoutResume} rapports sans résumé (ignorés)`);
      }

      if (rapportsWithResume.length === 0) {
        console.log('✅ Aucun rapport avec résumé à indexer');
        return;
      }

      console.log(`🚀 ${rapportsWithResume.length} rapports à indexer automatiquement`);

      const nonIndexedRapports = rapportsWithResume;

      // 5. Indexer chaque rapport non indexé (en arrière-plan)
      let successCount = 0;
      let errorCount = 0;

      for (const rapport of nonIndexedRapports) {
        try {
          console.log(`  📄 Indexation: ${rapport.titre}`);

          const { error } = await supabase.functions.invoke('index-rapport', {
            body: { rapport_id: rapport.id }
          });

          if (error) {
            console.error(`    ❌ Erreur:`, error.message);
            errorCount++;
          } else {
            console.log(`    ✅ Indexé`);
            successCount++;
          }

          // Pause de 500ms entre chaque rapport pour éviter surcharge
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err: any) {
          console.error(`    ❌ Exception:`, err.message);
          errorCount++;
        }
      }

      console.log('═══════════════════════════════════════');
      console.log(`✅ Auto-indexation terminée`);
      console.log(`   Succès: ${successCount}`);
      console.log(`   Erreurs: ${errorCount}`);
      console.log('═══════════════════════════════════════');
    } catch (error: any) {
      console.error('❌ Erreur lors de la vérification:', error.message);
    }
  };

  // Composant invisible - ne rend rien
  return null;
}
