import { Home, Settings, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavigationBannerProps {
  currentView: string;
  onNavigate: (view: 'dashboard' | 'settings' | 'account') => void;
}

export default function NavigationBanner({ currentView, onNavigate }: NavigationBannerProps) {
  const { user, signOut } = useAuth();

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-coral-500 p-2 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-gray-900 font-bold text-xl">Automatic Email</span>
          </div>

          <nav className="flex items-center gap-1">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${
                currentView === 'dashboard'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Home className="w-4 h-4" />
              Tableau de bord
            </button>

            <button
              onClick={() => onNavigate('settings')}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${
                currentView === 'settings'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              Configuration Email
            </button>

            <button
              onClick={() => onNavigate('account')}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${
                currentView === 'account'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <User className="w-4 h-4" />
              Compte
            </button>
          </nav>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">{user?.email}</span>
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
