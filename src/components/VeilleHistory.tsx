import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Download, Calendar, Tag, Sparkles } from 'lucide-react';

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

export default function VeilleHistory() {
  const { user } = useAuth();
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadRapports();
    }
  }, [user]);

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
    } catch (error) {
      console.error('❌ Exception in loadRapports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return "Veille du jour";
    if (isYesterday) return "Veille d'hier";

    const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 7) return `Veille il y a ${daysDiff} jour${daysDiff > 1 ? 's' : ''}`;

    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'quotidien': 'bg-blue-100 text-blue-700',
      'hebdomadaire': 'bg-purple-100 text-purple-700',
      'mensuel': 'bg-green-100 text-green-700',
      'veille_quotidienne': 'bg-blue-100 text-blue-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
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
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Historique des veilles</h2>

      {rapports.map((rapport) => (
        <div
          key={rapport.id}
          className="bg-white rounded-xl p-5 border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all"
        >
          {/* En-tête */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg mb-1">
                {formatDate(rapport.date_generation)}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(rapport.date_generation).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
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
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5 animate-pulse" />
              <p className="text-sm text-blue-800">
                Résumé en cours de génération par l'IA...
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
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
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Download className="w-4 h-4" />
                Écouter Audio
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
