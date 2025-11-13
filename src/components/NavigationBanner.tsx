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
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onNavigateToDashboard}>
            <div className="bg-gradient-to-br from-orange-500 to-coral-500 p-2 rounded-lg">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <span className="text-gray-900 font-bold text-xl">VEILLE IA</span>
          </div>

          <nav className="flex items-center gap-1">
            <button
              onClick={onNavigateToDashboard}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${
                currentView === 'dashboard'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Tableau de bord
            </button>

            <button
              onClick={onNavigateToChat}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${
                currentView === 'chat'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Modifier ma configuration
            </button>

            <button
              onClick={onNavigateToRAGAssistant}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${
                currentView === 'rag-assistant'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Assistant IA
            </button>

            <button
              onClick={onNavigateToHistorique}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${
                currentView === 'historique'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <History className="w-4 h-4" />
              Historique
            </button>

            <button
              onClick={onNavigateToSettings}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${
                currentView === 'settings'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              Paramètres
            </button>
          </nav>

          <div className="flex items-center gap-4">
            {currentView === 'chat' && onClearChatMessages && (
              <button
                onClick={onClearChatMessages}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-all"
                title="Effacer tous les messages et recommencer la configuration"
              >
                <Trash2 className="w-4 h-4" />
                Effacer les messages
              </button>
            )}
            <span className="text-sm text-gray-700">{userPrenom || user?.email}</span>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
            >
              Déconnexion
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
