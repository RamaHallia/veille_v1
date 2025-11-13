/**
 * Composant : IndexationStatus
 *
 * Affiche le statut d'indexation des rapports et déclenche
 * automatiquement l'indexation des rapports manquants.
 *
 * À ajouter dans le Dashboard ou l'App principale.
 */

import { useAutoIndexation } from '../hooks/useAutoIndexation';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';

export function IndexationStatus() {
  const { status, rapportsManquants, isChecking, isIndexing, error, manualReindex } = useAutoIndexation();

  // Ne rien afficher si tout est OK et pas d'action en cours
  if (!isChecking && !isIndexing && status && status.rapports_non_indexes === 0) {
    return null;
  }

  // Pendant la vérification initiale
  if (isChecking && !status) {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-4 max-w-md z-50">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <div>
            <p className="font-medium text-blue-900">Vérification de l'indexation...</p>
            <p className="text-sm text-blue-700">Analyse de vos rapports en cours</p>
          </div>
        </div>
      </div>
    );
  }

  // Pendant l'indexation
  if (isIndexing) {
    const progress = status
      ? Math.round((status.rapports_indexes / status.total_rapports) * 100)
      : 0;

    return (
      <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-md z-50">
        <div className="flex items-start gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Indexation en cours...</p>
            <p className="text-sm text-gray-600 mt-1">
              {rapportsManquants.length} rapports en cours d'indexation
            </p>

            {/* Barre de progression */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Progression</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Cette opération peut prendre quelques minutes
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Rapports non indexés détectés (avant indexation)
  if (status && status.rapports_non_indexes > 0 && !isIndexing) {
    return (
      <div className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4 max-w-md z-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-yellow-900">Rapports non indexés détectés</p>
            <p className="text-sm text-yellow-700 mt-1">
              {status.rapports_non_indexes} rapport{status.rapports_non_indexes > 1 ? 's' : ''} en attente d'indexation
            </p>

            {/* Statistiques */}
            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Total rapports:</span>
                <span className="font-medium">{status.total_rapports}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Indexés:</span>
                <span className="font-medium text-green-600">{status.rapports_indexes}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Progression:</span>
                <span className="font-medium">{status.pourcentage_indexe}%</span>
              </div>
            </div>

            <button
              onClick={manualReindex}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Indexer maintenant
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Erreur
  if (error) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 max-w-md z-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-900">Erreur d'indexation</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={manualReindex}
              className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tout est OK
  if (status && status.rapports_non_indexes === 0) {
    return (
      <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 max-w-md z-50 animate-fade-in">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-medium text-green-900">Indexation à jour</p>
            <p className="text-sm text-green-700">
              {status.total_rapports} rapport{status.total_rapports > 1 ? 's' : ''} indexé{status.total_rapports > 1 ? 's' : ''} • {status.total_chunks} chunks
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
