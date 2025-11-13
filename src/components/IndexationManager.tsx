import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function IndexationManager() {
  const [isIndexing, setIsIndexing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<{ success: number; errors: number } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  const indexAllReports = async () => {
    setIsIndexing(true);
    setResults(null);
    setLogs([]);
    addLog('🚀 Démarrage de l\'indexation...');

    try {
      // 1. Récupérer tous les rapports
      const { data: rapports, error: fetchError } = await supabase
        .from('rapports')
        .select('id, titre, date_generation')
        .order('date_generation', { ascending: false });

      if (fetchError) {
        addLog(`❌ Erreur: ${fetchError.message}`);
        setIsIndexing(false);
        return;
      }

      if (!rapports || rapports.length === 0) {
        addLog('ℹ️ Aucun rapport à indexer');
        setIsIndexing(false);
        return;
      }

      addLog(`📊 ${rapports.length} rapports trouvés`);
      setProgress({ current: 0, total: rapports.length });

      let successCount = 0;
      let errorCount = 0;

      // 2. Indexer chaque rapport
      for (let i = 0; i < rapports.length; i++) {
        const rapport = rapports[i];
        setProgress({ current: i + 1, total: rapports.length });

        addLog(`[${i + 1}/${rapports.length}] Indexation: ${rapport.titre}`);

        try {
          const { data, error } = await supabase.functions.invoke('index-rapport', {
            body: { rapport_id: rapport.id }
          });

          if (error) {
            addLog(`  ❌ Erreur: ${error.message}`);
            errorCount++;
          } else {
            addLog(`  ✅ ${data.chunks_created} chunks créés`);
            successCount++;
          }

          // Pause de 500ms entre chaque rapport pour éviter rate limits
          if (i < rapports.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (err: any) {
          addLog(`  ❌ Exception: ${err.message}`);
          errorCount++;
        }
      }

      // 3. Résultat final
      setResults({ success: successCount, errors: errorCount });
      addLog('═══════════════════════════════════════');
      addLog(`🎉 Indexation terminée !`);
      addLog(`✅ Succès: ${successCount}`);
      addLog(`❌ Erreurs: ${errorCount}`);

      // 4. Vérifier le total de chunks
      const { count } = await supabase
        .from('rapport_chunks')
        .select('*', { count: 'exact', head: true });

      addLog(`📦 Total de chunks dans la base: ${count || 0}`);
    } catch (error: any) {
      addLog(`❌ Erreur fatale: ${error.message}`);
    } finally {
      setIsIndexing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-gradient-to-br from-orange-500 to-coral-500 p-2 rounded-lg">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Indexation RAG
          </h3>
          <p className="text-sm text-gray-600">
            Indexer vos rapports pour l'Assistant IA
          </p>
        </div>
      </div>

      {/* Progression */}
      {isIndexing && progress.total > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progression</span>
            <span>{progress.current} / {progress.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-orange-500 to-coral-500 h-2 transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Résultats */}
      {results && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Succès</span>
            </div>
            <div className="text-2xl font-bold text-green-900 mt-1">
              {results.success}
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Erreurs</span>
            </div>
            <div className="text-2xl font-bold text-red-900 mt-1">
              {results.errors}
            </div>
          </div>
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Logs</div>
          <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
            <div className="font-mono text-xs space-y-1">
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`${
                    log.includes('✅') ? 'text-green-400' :
                    log.includes('❌') ? 'text-red-400' :
                    log.includes('🎉') ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
