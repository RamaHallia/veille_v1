/**
 * Hook : useAutoIndexation
 *
 * Vérifie automatiquement au chargement si tous les rapports du client
 * sont indexés, et déclenche l'indexation des rapports manquants.
 *
 * Usage :
 * import { useAutoIndexation } from '@/hooks/useAutoIndexation';
 *
 * function Dashboard() {
 *   const { status, isChecking } = useAutoIndexation();
 *
 *   return <div>Status: {status?.pourcentage_indexe}%</div>
 * }
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface IndexationStatus {
  total_rapports: number;
  rapports_indexes: number;
  rapports_non_indexes: number;
  total_chunks: number;
  pourcentage_indexe: number;
}

export interface RapportNonIndexe {
  rapport_id: string;
  titre: string;
  date_generation: string;
  has_content: boolean;
}

export function useAutoIndexation() {
  const { user } = useAuth();
  const [status, setStatus] = useState<IndexationStatus | null>(null);
  const [rapportsManquants, setRapportsManquants] = useState<RapportNonIndexe[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    checkAndIndexMissingRapports();
  }, [user]);

  const checkAndIndexMissingRapports = async () => {
    if (!user) return;

    setIsChecking(true);
    setError(null);

    try {
      console.log('🔍 Vérification de l\'indexation...');

      // 1. Vérifier le statut d'indexation
      const { data: statusData, error: statusError } = await supabase
        .rpc('check_indexation_status', { p_user_id: user.id });

      if (statusError) {
        throw statusError;
      }

      const currentStatus = statusData?.[0];
      setStatus(currentStatus);

      console.log('📊 Statut indexation:', currentStatus);

      // 2. Si tous les rapports sont indexés, terminé
      if (!currentStatus || currentStatus.rapports_non_indexes === 0) {
        console.log('✅ Tous les rapports sont déjà indexés');
        setIsChecking(false);
        return;
      }

      // 3. Récupérer la liste des rapports non indexés
      const { data: rapportsData, error: rapportsError } = await supabase
        .rpc('get_rapports_non_indexes', { p_user_id: user.id });

      if (rapportsError) {
        throw rapportsError;
      }

      setRapportsManquants(rapportsData || []);

      console.log(`⚠️ ${currentStatus.rapports_non_indexes} rapports non indexés trouvés`);

      // 4. Déclencher l'indexation automatique
      await indexMissingRapports();

    } catch (err: any) {
      console.error('❌ Erreur lors de la vérification:', err);
      setError(err.message);
    } finally {
      setIsChecking(false);
    }
  };

  const indexMissingRapports = async () => {
    if (!user || rapportsManquants.length === 0) return;

    setIsIndexing(true);

    try {
      console.log(`🚀 Déclenchement de l'indexation pour ${rapportsManquants.length} rapports...`);

      // Appeler chaque rapport via l'Edge Function
      const promises = rapportsManquants.map(async (rapport) => {
        try {
          const { data, error } = await supabase.functions.invoke('index-rapport', {
            body: { rapport_id: rapport.rapport_id }
          });

          if (error) {
            console.error(`❌ Erreur indexation ${rapport.titre}:`, error);
            return { success: false, rapport_id: rapport.rapport_id, error };
          }

          console.log(`✅ Indexation réussie: ${rapport.titre}`);
          return { success: true, rapport_id: rapport.rapport_id, data };
        } catch (err) {
          console.error(`❌ Erreur indexation ${rapport.titre}:`, err);
          return { success: false, rapport_id: rapport.rapport_id, error: err };
        }
      });

      // Attendre toutes les indexations (en parallèle, max 5 à la fois)
      const BATCH_SIZE = 5;
      const results = [];

      for (let i = 0; i < promises.length; i += BATCH_SIZE) {
        const batch = promises.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch);
        results.push(...batchResults);

        console.log(`📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(promises.length / BATCH_SIZE)} terminé`);
      }

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      console.log(`✅ Indexation terminée: ${successCount} succès, ${errorCount} erreurs`);

      // Rafraîchir le statut
      setTimeout(() => {
        checkStatusOnly();
      }, 2000);

    } catch (err: any) {
      console.error('❌ Erreur lors de l\'indexation:', err);
      setError(err.message);
    } finally {
      setIsIndexing(false);
    }
  };

  const checkStatusOnly = async () => {
    if (!user) return;

    try {
      const { data: statusData, error: statusError } = await supabase
        .rpc('check_indexation_status', { p_user_id: user.id });

      if (!statusError && statusData?.[0]) {
        setStatus(statusData[0]);
      }
    } catch (err) {
      console.error('❌ Erreur lors de la vérification du statut:', err);
    }
  };

  const manualReindex = () => {
    checkAndIndexMissingRapports();
  };

  return {
    status,
    rapportsManquants,
    isChecking,
    isIndexing,
    error,
    manualReindex,
  };
}
