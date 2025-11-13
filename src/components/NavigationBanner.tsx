import { Bell, MessageSquare, Sparkles, History, Settings, LogOut, Trash2, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavigationBannerProps {
  currentView: string;
  onNavigateToChat: () => void;
  onNavigateToRAGAssistant: () => void;
  onNavigateToHistorique: () => void;
  onNavigateToSettings: () => void;
  onNavigateToDashboard: () => void;
  onClearChatMessages?: () => void;
}

export default function NavigationBanner({
  currentView,
  onNavigateToChat,
  onNavigateToRAGAssistant,
  onNavigateToHistorique,
  onNavigateToSettings,
  onNavigateToDashboard,
  onClearChatMessages
}: NavigationBannerProps) {
  const { user, userPrenom, signOut } = useAuth();

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-full mx-auto px-4">
        <div className="flex items-center justify-between py-3 gap-4">
          <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={onNavigateToDashboard}>
            <div className="bg-gradient-to-br from-orange-500 to-coral-500 p-1.5 rounded-lg">
              <Bell className="w-4 h-4 text-white" />
            </div>
            <span className="text-gray-900 font-bold text-lg whitespace-nowrap">VEILLE IA</span>
          </div>

          <nav className="flex items-center gap-0.5 flex-1 justify-center">
            <button
              onClick={onNavigateToDashboard}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                currentView === 'dashboard'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Tableau de bord
            </button>

            <button
              onClick={onNavigateToChat}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                currentView === 'chat'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Configuration
            </button>

            <button
              onClick={onNavigateToRAGAssistant}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                currentView === 'rag-assistant'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Assistant IA
            </button>

            <button
              onClick={onNavigateToHistorique}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                currentView === 'historique'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Historique
            </button>

            <button
              onClick={onNavigateToSettings}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                currentView === 'settings'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Paramètres
            </button>
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            {currentView === 'chat' && onClearChatMessages && (
              <button
                onClick={onClearChatMessages}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-all whitespace-nowrap"
                title="Effacer tous les messages et recommencer la configuration"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Effacer
              </button>
            )}
            {userPrenom && (
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{userPrenom}</span>
            )}
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
