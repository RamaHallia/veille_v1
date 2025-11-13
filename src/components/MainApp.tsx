import { useState } from 'react';
import ChatInterface from './ChatInterface';
import VeilleDashboard from './VeilleDashboard';
import SettingsPage from './SettingsPage';
import VeilleHistoryPage from './VeilleHistoryPage';
import RAGChatPage from './RAGChatPage';
import AutoIndexer from './AutoIndexer';
import { IndexationStatus } from './IndexationStatus';
import NavigationBanner from './NavigationBanner';

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
      return <VeilleHistoryPageWrapper />;
    }

    if (currentView === 'rag-assistant') {
      return <RAGChatPage onBack={navigateToDashboard} />;
    }

    return <ChatInterface onNavigateToDashboard={navigateToDashboard} />;
  }
}

function VeilleHistoryPageWrapper() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <VeilleHistoryPage />
    </div>
  );
}
