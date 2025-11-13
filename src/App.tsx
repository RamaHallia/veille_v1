import { useState } from 'react';
import { Bell, TrendingUp, Users, Mail, ArrowRight, ChevronDown, LogOut, Settings, FileText, Headphones, Sparkles, CheckCircle2, Rocket, Lock, MessageSquare, Download, Play } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import MainApp from './components/MainApp';

function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, signOut } = useAuth();

  if (user) {
    return <MainApp />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gradient-to-br from-orange-50/30 via-peach-50 to-orange-100/40 py-3">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-gray-600/95 backdrop-blur-sm rounded-2xl px-6 py-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-500 to-coral-500 p-2 rounded-lg">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-xl">VEILLE IA</span>
            </div>
            <nav className="hidden md:flex items-center text-white/90">
              <a href="#fonctionnement" className="hover:text-white transition-colors px-6 py-2">Fonctionnement</a>
              <div className="h-6 w-px bg-white/20"></div>
              <a href="#dashboard" className="hover:text-white transition-colors px-6 py-2">Dashboard</a>
              <a href="#ia" className="hover:text-white transition-colors px-6 py-2">IA</a>
              <a href="#livrables" className="hover:text-white transition-colors px-6 py-2">Livrables</a>
            </nav>
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-white text-sm">{user.email}</span>
                <button
                  onClick={signOut}
                  className="bg-gray-500/60 hover:bg-gray-500/80 text-white px-6 py-2.5 rounded-xl transition-all text-sm flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-gray-500/60 hover:bg-gray-500/80 text-white px-6 py-2.5 rounded-xl transition-all text-sm"
              >
                Se connecter
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-50/40 via-peach-100/60 to-orange-200/50">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight mb-6">
              Votre veille,
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-coral-500">
                automatisée par l'IA
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
              Recevez chaque semaine vos rapports de veille en PDF et audio, générés automatiquement selon vos préférences.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <button className="bg-gradient-to-r from-orange-500 to-coral-500 hover:shadow-xl text-white px-8 py-4 rounded-xl font-semibold transition-all text-lg">
                Créer ma veille
              </button>
              <button className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-xl font-semibold transition-all text-lg border-2 border-gray-200 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Voir une démo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="fonctionnement" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Comment ça marche</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="bg-gradient-to-br from-orange-500 to-coral-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                <Settings className="w-8 h-8 text-white" />
              </div>
              <div className="bg-orange-50 rounded-full px-4 py-1 inline-block mb-4">
                <span className="text-orange-600 font-bold text-sm">Étape 1</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Configurez votre veille</h3>
              <p className="text-gray-600 leading-relaxed">
                Choisissez votre domaine, vos concurrents, vos sources presse et la fréquence de vos rapports.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-orange-500 to-coral-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="bg-orange-50 rounded-full px-4 py-1 inline-block mb-4">
                <span className="text-orange-600 font-bold text-sm">Étape 2</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Laissez l'IA analyser</h3>
              <p className="text-gray-600 leading-relaxed">
                Notre moteur collecte, filtre et résume les informations pertinentes grâce à l'automatisation n8n.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-orange-500 to-coral-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <div className="bg-orange-50 rounded-full px-4 py-1 inline-block mb-4">
                <span className="text-orange-600 font-bold text-sm">Étape 3</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Recevez vos rapports</h3>
              <p className="text-gray-600 leading-relaxed">
                Vos synthèses sont envoyées automatiquement en PDF et audio par e-mail, Slack ou WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Section */}
      <section id="dashboard" className="bg-gradient-to-br from-gray-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Tout votre suivi au même endroit
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Visualisez vos veilles récentes, consultez les articles clés et accédez à vos rapports PDF et audios en un clic.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Dernières veilles avec date et résumé</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Téléchargement PDF en un clic</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Écoute audio directe</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                  <span className="text-gray-700">Indicateurs : articles, concurrents, sources</span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-coral-500 rounded-2xl blur-2xl opacity-20"></div>
              <div className="relative bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Dernières veilles</h3>
                  <span className="text-sm text-gray-500">12 Nov 2024</span>
                </div>
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-orange-50 to-peach-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-700 mb-3">E-commerce : 12 articles · 5 concurrents</p>
                    <div className="flex gap-2">
                      <button className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
                        <Download className="w-4 h-4" />
                        PDF
                      </button>
                      <button className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
                        <Headphones className="w-4 h-4" />
                        Audio
                      </button>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 p-4 rounded-xl">
                    <p className="text-sm text-gray-700 mb-3">IA & Tech : 8 articles · 3 concurrents</p>
                    <div className="flex gap-2">
                      <button className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
                        <Download className="w-4 h-4" />
                        PDF
                      </button>
                      <button className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
                        <Headphones className="w-4 h-4" />
                        Audio
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Chat Section */}
      <section id="ia" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative order-2 md:order-1">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-coral-500 rounded-2xl blur-2xl opacity-20"></div>
              <div className="relative bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <MessageSquare className="w-6 h-6 text-orange-500" />
                  <h3 className="text-xl font-bold text-gray-900">Chat IA</h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-700">Quels concurrents ont levé des fonds cette semaine ?</p>
                  </div>
                  <div className="bg-gradient-to-r from-orange-50 to-peach-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-700">D'après votre veille, 2 concurrents ont annoncé des levées de fonds : StartupX (5M€) et CompanyY (12M€).</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-700">Résume-moi les tendances du e-commerce dans ma veille.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Un chat IA qui comprend vos veilles
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Posez vos questions : l'IA répond à partir de vos propres rapports, sans recherche externe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Deliverables Section */}
      <section id="livrables" className="bg-gradient-to-br from-gray-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Vos rapports automatiques</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-xl transition-all text-center">
              <div className="bg-gradient-to-br from-orange-500 to-coral-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Rapport PDF</h3>
              <p className="text-gray-600 leading-relaxed">
                Résumé clair et structuré de votre veille
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-xl transition-all text-center">
              <div className="bg-gradient-to-br from-orange-500 to-coral-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                <Headphones className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Fichier audio</h3>
              <p className="text-gray-600 leading-relaxed">
                Écoute rapide sur mobile ou en déplacement
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-xl transition-all text-center">
              <div className="bg-gradient-to-br from-orange-500 to-coral-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Envoi automatisé</h3>
              <p className="text-gray-600 leading-relaxed">
                Par email, Slack ou WhatsApp
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Customization Section */}
      <section className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Une veille adaptée à vos besoins
          </h2>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
            Modifiez vos préférences à tout moment : sources, concurrents, fréquence ou canal de diffusion.
          </p>
          <button className="bg-gradient-to-r from-orange-500 to-coral-500 hover:shadow-xl text-white px-8 py-4 rounded-xl font-semibold transition-all text-lg">
            Modifier mes paramètres
          </button>
        </div>
      </section>

      {/* Available Now Section */}
      <section className="bg-gradient-to-br from-gray-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Ce que vous pouvez déjà faire
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700 text-lg">Configurer votre veille</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700 text-lg">Générer un rapport PDF et audio</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700 text-lg">Recevoir vos veilles automatiquement</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700 text-lg">Consulter votre tableau de bord</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700 text-lg">Utiliser le chat IA contextuel</span>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Et bientôt...
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Rocket className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                  <span className="text-gray-700 text-lg">Publication LinkedIn automatique</span>
                </li>
                <li className="flex items-start gap-3">
                  <Rocket className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                  <span className="text-gray-700 text-lg">Recherche et filtrage avancés</span>
                </li>
                <li className="flex items-start gap-3">
                  <Rocket className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                  <span className="text-gray-700 text-lg">Dashboard analytique</span>
                </li>
                <li className="flex items-start gap-3">
                  <Rocket className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                  <span className="text-gray-700 text-lg">Comptes multi-utilisateurs</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-orange-500 via-coral-500 to-orange-600 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Prêt à commencer ?</h2>
          <p className="text-xl text-white/90 mb-8">Créez votre première veille en quelques minutes</p>
          <button className="bg-white hover:shadow-2xl text-gray-900 px-10 py-4 rounded-xl font-semibold text-lg transition-all">
            Créer ma veille
          </button>
        </div>
      </section>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Footer */}
      <footer className="bg-gray-900 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex items-center gap-3 justify-center mb-6">
              <Lock className="w-6 h-6 text-orange-500" />
              <h3 className="text-2xl font-bold text-white">Données sécurisées, IA transparente</h3>
            </div>
            <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8">
              Vos données sont hébergées sur Supabase (Europe). Les automatisations sont traitées par n8n. Aucune donnée n'est partagée sans votre accord.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-orange-500 transition-colors">Confidentialité</a>
              <span className="text-gray-700">·</span>
              <a href="#" className="text-gray-400 hover:text-orange-500 transition-colors">Contact support</a>
              <span className="text-gray-700">·</span>
              <a href="#" className="text-gray-400 hover:text-orange-500 transition-colors">Documentation technique</a>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-orange-500 to-coral-500 p-2 rounded-lg">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-white">VEILLE IA</span>
              </div>
              <p className="text-sm text-gray-500">© Veille IA. Tous droits réservés. 2025</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
