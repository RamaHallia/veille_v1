import { useState } from 'react';
import ChatInterface from './ChatInterface';
import VeilleDashboard from './VeilleDashboard';
import SettingsPage from './SettingsPage';
import VeilleHistoryPage from './VeilleHistoryPage';
import RAGChatPage from './RAGChatPage';
import AutoIndexer from './AutoIndexer';
import { IndexationStatus } from './IndexationStatus';
import NavigationBanner from './NavigationBanner';
import { useAuth } from '../contexts/AuthContext';
import { Bell, LogOut, Settings, MessageSquare, LayoutDashboard, Bot } from 'lucide-react';

type View = 'chat' | 'dashboard' | 'settings' | 'historique' | 'rag-assistant';

export default function MainApp() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [dashboardKey, setDashboardKey] = useState(0);

  const navigateToDashboard = () => {
    setDashboardKey(prev => prev + 1);
    setCurrentView('dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBanner
        currentView={currentView}
        onNavigateToDashboard={navigateToDashboard}
        onNavigateToChat={() => setCurrentView('chat')}
        onNavigateToRAGAssistant={() => setCurrentView('rag-assistant')}
        onNavigateToHistorique={() => setCurrentView('historique')}
        onNavigateToSettings={() => setCurrentView('settings')}
      />
      <AutoIndexer />
      <IndexationStatus />
      {renderView()}
    </div>
  );

  function renderView() {
    if (currentView === 'dashboard') {
      return (
        <VeilleDashboard
          key={dashboardKey}
          onNavigateToChat={() => setCurrentView('chat')}
          onNavigateToSettings={() => setCurrentView('settings')}
          onNavigateToHistorique={() => setCurrentView('historique')}
          onNavigateToRAGAssistant={() => setCurrentView('rag-assistant')}
        />
      );
    }

    if (currentView === 'settings') {
      return <SettingsPage onNavigateToDashboard={navigateToDashboard} />;
    }

    if (currentView === 'historique') {
      return (
        <VeilleHistoryPageWrapper
          onNavigateToDashboard={navigateToDashboard}
          onNavigateToChat={() => setCurrentView('chat')}
          onNavigateToSettings={() => setCurrentView('settings')}
        />
      );
    }

    if (currentView === 'rag-assistant') {
      return <RAGChatPage onBack={navigateToDashboard} />;
    }

    return <ChatInterface onNavigateToDashboard={navigateToDashboard} />;
  }
}

// Wrapper pour VeilleHistoryPage avec le header
function VeilleHistoryPageWrapper({
  onNavigateToDashboard,
  onNavigateToChat,
  onNavigateToSettings,
}: {
  onNavigateToDashboard: () => void;
  onNavigateToChat: () => void;
  onNavigateToSettings: () => void;
}) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-peach-50 to-orange-100/40">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-orange-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-orange-500 to-coral-500 p-2 rounded-lg">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <span className="text-gray-900 font-bold text-xl">VEILLE IA</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onNavigateToDashboard}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 rounded-xl transition-all font-medium"
          >
            <LayoutDashboard size={16} />
            Tableau de bord
          </button>
          <button
            onClick={onNavigateToChat}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 rounded-xl transition-all font-medium"
          >
            <MessageSquare size={16} />
            Chat
          </button>
          <button
            onClick={onNavigateToSettings}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 rounded-xl transition-all font-medium"
          >
            <Settings size={16} />
            Paramètres
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-coral-500 rounded-full flex items-center justify-center text-white font-bold">
              {user?.email?.[0].toUpperCase()}
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 rounded-xl transition-all font-medium"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <VeilleHistoryPage />
      </div>
    </div>
  );
}
