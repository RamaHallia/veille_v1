import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Download, Calendar, Tag, Sparkles, Eye, X, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

interface Rapport {
  id: string;
  titre: string;
  date_generation: string;
  type_rapport: string;
  pdf_url: string | null;
  audio_url: string | null;
  nb_sources: number;
  mots_cles: string[];
  resume: string | null;
  statut: string;
}

const RAPPORTS_PER_PAGE = 10;
const STORAGE_KEY = 'veille_history_page';

export default function VeilleHistoryPage() {
  const { user } = useAuth();
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [filteredRapports, setFilteredRapports] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRapport, setSelectedRapport] = useState<Rapport | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(() => {
    // Charger la page depuis localStorage au montage
    const savedPage = localStorage.getItem(STORAGE_KEY);
    return savedPage ? parseInt(savedPage, 10) : 1;
  });
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (user?.id) {
      loadRapports();
    }
  }, [user]);

  // Sauvegarder la page actuelle dans localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currentPage.toString());
  }, [currentPage]);

  const loadRapports = async () => {
    try {
      if (!user?.id) {
        console.warn('⚠️ No user ID available yet');
        setLoading(false);
        return;
      }

      console.log('🔍 VeilleHistory - Loading rapports...');
      console.log('User ID:', user?.id);

      // Récupérer le client_id de l'utilisateur
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (clientError) {
        console.error('❌ Error loading client:', clientError);
        return;
      }

      if (!clientData) {
        console.warn('⚠️ No client found for user:', user?.id);
        return;
      }

      console.log('✅ Client ID found:', clientData.id);
      console.log('🔍 Querying rapports with client_id:', clientData.id);

      // Récupérer les rapports triés par date
      const { data, error } = await supabase
        .from('rapports')
        .select('*')
        .eq('client_id', clientData.id)
        .order('date_generation', { ascending: false });

      if (error) {
        console.error('❌ Error loading rapports:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return;
      }

      console.log('📊 Rapports loaded:', data?.length || 0);
      console.log('Rapports data:', data);

      if (data && data.length === 0) {
        console.warn('⚠️ No rapports found for client_id:', clientData.id);
        console.warn('⚠️ Check if RLS is enabled on rapports table or if data exists');
      }

      setRapports(data || []);
      setFilteredRapports(data || []);
    } catch (error) {
      console.error('❌ Exception in loadRapports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les rapports (sans toucher à currentPage)
  useEffect(() => {
    let filtered = [...rapports];

    // Filtre par recherche de texte
    if (searchTerm.trim()) {
      filtered = filtered.filter(rapport =>
        rapport.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rapport.mots_cles.some(mc => mc.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtre par date
    if (dateFilter) {
      filtered = filtered.filter(rapport => {
        const rapportDate = new Date(rapport.date_generation).toISOString().split('T')[0];
        return rapportDate === dateFilter;
      });
    }

    setFilteredRapports(filtered);
  }, [searchTerm, dateFilter, rapports]);

  // Réinitialiser à la page 1 UNIQUEMENT quand les filtres changent (pas au chargement initial)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setCurrentPage(1);
  }, [searchTerm, dateFilter]);

  const openRapportModal = (rapport: Rapport) => {
    setSelectedRapport(rapport);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRapport(null);
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'quotidien': 'bg-orange-100 text-orange-700',
      'hebdomadaire': 'bg-coral-100 text-coral-700',
      'mensuel': 'bg-peach-100 text-orange-700',
      'veille_quotidienne': 'bg-orange-100 text-orange-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  // Calculs de pagination
  const totalPages = Math.ceil(filteredRapports.length / RAPPORTS_PER_PAGE);
  const startIndex = (currentPage - 1) * RAPPORTS_PER_PAGE;
  const endIndex = startIndex + RAPPORTS_PER_PAGE;
  const paginatedRapports = filteredRapports.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll vers le haut
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      // Afficher toutes les pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Afficher avec des ellipses
      if (currentPage <= 3) {
        // Au début
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // À la fin
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        // Au milieu
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (rapports.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-orange-100 p-4 rounded-full inline-block mb-4">
          <FileText className="w-8 h-8 text-orange-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun rapport généré</h3>
        <p className="text-gray-600">Vos rapports de veille apparaîtront ici une fois générés.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Historique des veilles</h2>
          <div className="flex items-center gap-3">
            {/* Filtre par recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              />
            </div>

            {/* Filtre par date */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              />
            </div>

            {/* Bouton réinitialiser */}
            {(searchTerm || dateFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDateFilter('');
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Compteur de résultats */}
        <div className="text-sm text-gray-600 mb-4">
          {filteredRapports.length > 0 ? (
            <>
              Affichage de {startIndex + 1} à {Math.min(endIndex, filteredRapports.length)} sur {filteredRapports.length} rapport{filteredRapports.length > 1 ? 's' : ''}
              {(searchTerm || dateFilter) && ` (filtré${filteredRapports.length > 1 ? 's' : ''} sur ${rapports.length} au total)`}
            </>
          ) : (
            <>
              {filteredRapports.length} rapport{filteredRapports.length > 1 ? 's' : ''} trouvé{filteredRapports.length > 1 ? 's' : ''}
            </>
          )}
        </div>

        {filteredRapports.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun résultat</h3>
            <p className="text-gray-600">Essayez de modifier vos filtres de recherche.</p>
          </div>
        ) : (
          <>
            {paginatedRapports.map((rapport, idx) => (
          <div
            key={rapport.id}
            className="stagger-item bg-white rounded-xl p-5 border border-gray-200 hover:border-orange-300 hover:shadow-xl transition-all hover-lift"
          >
            {/* En-tête */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg mb-1">
                  {rapport.titre}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(rapport.date_generation).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(rapport.type_rapport)}`}>
                  {rapport.nb_sources} article{rapport.nb_sources > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Tags / Mots-clés */}
            {rapport.mots_cles && rapport.mots_cles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {rapport.mots_cles.slice(0, 3).map((motCle, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                  >
                    <Tag className="w-3 h-3" />
                    {motCle}
                  </span>
                ))}
                {rapport.mots_cles.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{rapport.mots_cles.length - 3} autres
                  </span>
                )}
              </div>
            )}

            {/* Résumé */}
            {rapport.resume ? (
              <p className="text-gray-700 text-sm leading-relaxed mb-4 bg-gray-50 p-3 rounded-lg italic">
                {rapport.resume}
              </p>
            ) : (
              <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5 animate-pulse" />
                <p className="text-sm text-orange-800">
                  Résumé en cours de génération par l'IA...
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => openRapportModal(rapport)}
                className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                <Eye className="w-4 h-4" />
                Voir le rapport
              </button>
              {rapport.pdf_url && (
                <a
                  href={rapport.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  <Download className="w-4 h-4" />
                  Télécharger PDF
                </a>
              )}
              {rapport.audio_url && (
                <a
                  href={rapport.audio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  <Download className="w-4 h-4" />
                  Écouter Audio
                </a>
              )}
            </div>
          </div>
        ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {currentPage} sur {totalPages}
                </div>

                <div className="flex items-center gap-2">
                  {/* Bouton Précédent */}
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Précédent
                  </button>

                  {/* Numéros de page */}
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, idx) => (
                      <button
                        key={idx}
                        onClick={() => typeof page === 'number' && goToPage(page)}
                        disabled={page === '...'}
                        className={`px-3 py-2 rounded-lg font-medium transition-all ${
                          page === currentPage
                            ? 'bg-orange-500 text-white'
                            : page === '...'
                            ? 'cursor-default'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  {/* Bouton Suivant */}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                  >
                    Suivant
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal pour afficher le rapport */}
      {showModal && selectedRapport && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl animate-scaleIn">
            {/* Header du modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedRapport.titre}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(selectedRapport.date_generation).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Contenu du modal */}
            <div className="flex-1 overflow-hidden p-6">
              {selectedRapport.pdf_url ? (
                <iframe
                  src={selectedRapport.pdf_url}
                  className="w-full h-full min-h-[750px] rounded-lg border border-gray-200"
                  title="Rapport PDF"
                />
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucun PDF disponible pour ce rapport</p>
                </div>
              )}
            </div>

            {/* Footer du modal */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                {selectedRapport.pdf_url && (
                  <a
                    href={selectedRapport.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger PDF
                  </a>
                )}
                {selectedRapport.audio_url && (
                  <a
                    href={selectedRapport.audio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Audio
                  </a>
                )}
              </div>
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
