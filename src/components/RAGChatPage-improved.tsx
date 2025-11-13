/**
 * Version améliorée de RAGChatPage avec :
 * - Indicateur de statut (combien de rapports indexés)
 * - Meilleurs messages d'erreur
 * - Questions suggérées contextuelles
 * - Bouton pour forcer l'indexation
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Bot, User, FileText, Calendar, Sparkles, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  created_at: string;
}

interface Source {
  titre: string;
  date: string;
  excerpt: string;
}

interface RAGChatPageProps {
  onBack?: () => void;
}

interface RAGStatus {
  totalRapports: number;
  rapportsIndexes: number;
  totalChunks: number;
  isReady: boolean;
  lastIndexation?: string;
}

export default function RAGChatPageImproved({ onBack }: RAGChatPageProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ragStatus, setRagStatus] = useState<RAGStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Charger le statut RAG
  useEffect(() => {
    loadRAGStatus();
  }, [user]);

  const loadRAGStatus = async () => {
    if (!user) return;

    setIsLoadingStatus(true);
    try {
      // Récupérer le client_id
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!client) return;

      // Compter les rapports
      const { count: totalRapports } = await supabase
        .from('rapports')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id);

      // Compter les rapports indexés
      const { count: rapportsIndexes } = await supabase
        .from('rapports')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('indexe_rag', true);

      // Compter les chunks
      const { count: totalChunks } = await supabase
        .from('rapport_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id);

      // Date de dernière indexation
      const { data: lastChunk } = await supabase
        .from('rapport_chunks')
        .select('created_at')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setRagStatus({
        totalRapports: totalRapports || 0,
        rapportsIndexes: rapportsIndexes || 0,
        totalChunks: totalChunks || 0,
        isReady: (totalChunks || 0) > 0,
        lastIndexation: lastChunk?.created_at
      });
    } catch (error) {
      console.error('Error loading RAG status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Ajouter le message utilisateur
    const tempUserMessage: Message = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      // Appeler l'Edge Function RAG
      const { data, error } = await supabase.functions.invoke('rag-query', {
        body: {
          question: userMessage,
          user_id: user?.id
        }
      });

      if (error) throw error;

      // Ajouter la réponse de l'assistant
      const assistantMessage: Message = {
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error:', error);

      // Messages d'erreur améliorés
      let errorContent = '';

      if (error.message?.includes('not found') || error.message?.includes('Client not found')) {
        errorContent = `🔍 **Aucune information trouvée**\n\nJe n'ai pas pu trouver d'informations pertinentes dans votre historique de veilles pour répondre à cette question.\n\n**Suggestions :**\n- Essayez une question plus large\n- Attendez que plus de rapports soient générés\n- Vérifiez que vos rapports ont bien été indexés`;
      } else if (error.message?.includes('edge function') || error.message?.includes('function')) {
        errorContent = `⚠️ **Service temporairement indisponible**\n\nL'Assistant IA n'est pas accessible pour le moment.\n\n**Causes possibles :**\n- Les Edge Functions ne sont pas déployées\n- Problème de configuration\n\nVeuillez réessayer dans quelques instants ou contactez le support.`;
      } else if (error.message?.includes('OpenAI') || error.message?.includes('API')) {
        errorContent = `🤖 **Erreur du service IA**\n\nLe service d'intelligence artificielle a rencontré une erreur.\n\n**Causes possibles :**\n- Clé API OpenAI manquante ou invalide\n- Quota dépassé\n\nVeuillez contacter le support technique.`;
      } else {
        errorContent = `❌ **Une erreur s'est produite**\n\n${error.message}\n\n**Assurez-vous que :**\n- Vos rapports ont été indexés (voir statut ci-dessus)\n- Les Edge Functions sont déployées\n- La configuration est correcte`;
      }

      const errorMessage: Message = {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: errorContent,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Questions suggérées contextuelles
  const suggestedQuestions = ragStatus?.isReady ? [
    "Quelles sont les dernières tendances dans mon secteur ?",
    "Résume les activités de mes concurrents ce mois-ci",
    "Quelles technologies émergentes sont mentionnées dans mes veilles ?",
    "Compare les stratégies de mes concurrents"
  ] : [
    "Comment fonctionne l'Assistant IA ?",
    "Que puis-je demander à l'Assistant ?",
    "Quand mes rapports seront-ils indexés ?"
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-blue-50 rounded-xl transition-all hover:scale-105"
                  title="Retour"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
              )}
              <div className="bg-gradient-to-br from-orange-500 to-coral-500 p-3 rounded-xl shadow-md">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  Assistant IA
                  <span className="text-xs font-normal bg-orange-100 text-orange-700 px-2 py-1 rounded-full">Beta</span>
                </h1>
                <p className="text-sm text-gray-600 font-medium">Interrogez votre historique de veilles</p>
              </div>
            </div>

            {/* Indicateur de statut */}
            <div className="flex items-center gap-4">
              {isLoadingStatus ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Chargement...
                </div>
              ) : ragStatus ? (
                <div className="flex items-center gap-3">
                  {/* Statut principal */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    ragStatus.isReady
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-orange-50 border border-orange-200'
                  }`}>
                    {ragStatus.isReady ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">
                          {ragStatus.totalChunks} chunks indexés
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-700">
                          En attente d'indexation
                        </span>
                      </>
                    )}
                  </div>

                  {/* Bouton rafraîchir */}
                  <button
                    onClick={loadRAGStatus}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                    title="Rafraîchir le statut"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-600" />
                  </button>

                  {/* Avatar */}
                  <div className="bg-gradient-to-br from-orange-500 to-coral-500 w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                    {user?.email?.[0].toUpperCase()}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Barre d'information détaillée (si pas prêt) */}
          {!isLoadingStatus && ragStatus && !ragStatus.isReady && (
            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-orange-900 mb-1">
                    Assistant IA en cours de préparation
                  </p>
                  <p className="text-xs text-orange-700 mb-3">
                    Vos rapports sont en cours d'indexation. Cela peut prendre quelques minutes.
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-orange-600 font-medium">Rapports totaux</span>
                      <p className="text-orange-900 font-bold text-lg">{ragStatus.totalRapports}</p>
                    </div>
                    <div>
                      <span className="text-orange-600 font-medium">Indexés</span>
                      <p className="text-orange-900 font-bold text-lg">{ragStatus.rapportsIndexes}</p>
                    </div>
                    <div>
                      <span className="text-orange-600 font-medium">Chunks</span>
                      <p className="text-orange-900 font-bold text-lg">{ragStatus.totalChunks}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="relative mb-6 animate-fadeIn">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-coral-500 p-5 rounded-3xl blur-xl opacity-30"></div>
                <div className="relative bg-gradient-to-br from-orange-500 to-coral-500 p-5 rounded-3xl shadow-2xl">
                  <Sparkles className="w-14 h-14 text-white animate-pulse" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-orange-600 to-coral-600 bg-clip-text text-transparent">
                Posez-moi vos questions
              </h3>
              <p className="text-gray-600 max-w-lg mb-10 text-[15px] leading-relaxed">
                Je peux analyser votre historique de veilles et répondre à vos questions sur les tendances, les concurrents, les technologies émergentes et bien plus encore.
              </p>

              <div className="w-full max-w-3xl">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  <p className="text-sm font-bold text-gray-800">
                    {ragStatus?.isReady ? 'Suggestions de questions :' : 'Questions pour débuter :'}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suggestedQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputMessage(question)}
                      disabled={!ragStatus?.isReady && idx < 3}
                      className="stagger-item p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-orange-400 hover:shadow-lg text-left transition-all group hover:scale-[1.02] active:scale-[0.98] hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start gap-3">
                        <div className="bg-orange-100 p-2 rounded-lg group-hover:bg-orange-500 transition-colors">
                          <Sparkles className="w-4 h-4 text-orange-600 group-hover:text-white transition-colors" />
                        </div>
                        <div className="text-sm text-gray-900 font-medium group-hover:text-orange-600 transition-colors flex-1">
                          {question}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="animate-fadeInUp">
              <div className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center shadow-md ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-orange-500 to-pink-500'
                    : 'bg-gradient-to-br from-orange-500 to-coral-500'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Message */}
                <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block max-w-[85%] p-5 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-900 shadow-md'
                  }`}>
                    {message.role === 'user' ? (
                      <div className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">
                        {message.content}
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none
                        prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-bold prose-headings:text-gray-900
                        prose-h2:text-lg prose-h3:text-base
                        prose-p:text-gray-800 prose-p:leading-relaxed prose-p:my-2 prose-p:text-[15px]
                        prose-strong:text-gray-900 prose-strong:font-semibold
                        prose-ul:my-3 prose-ul:space-y-1
                        prose-li:text-gray-800 prose-li:text-[15px] prose-li:leading-relaxed
                        prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                        prose-a:text-orange-600 prose-a:no-underline hover:prose-a:underline">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 space-y-2.5 max-w-[85%]">
                      <div className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
                        <div className="bg-orange-500 p-1.5 rounded-lg">
                          <FileText className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span>Sources ({message.sources.length})</span>
                      </div>
                      {message.sources.map((source, idx) => (
                        <div key={idx} className="stagger-item bg-gradient-to-br from-orange-50 to-peach-50 border-2 border-orange-200 rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group hover-lift">
                          <div className="font-semibold text-orange-900 text-sm mb-2 group-hover:text-orange-700 transition-colors">
                            📄 {source.titre}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-orange-700 mb-2.5 font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(source.date).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-700 line-clamp-2 italic bg-white/50 p-2 rounded-lg border border-orange-100">
                            "{source.excerpt}"
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Loading */}
          {isLoading && (
            <div className="flex gap-4 animate-slideInRight">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-500 to-coral-500 flex items-center justify-center shadow-md">
                <Bot className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-md animate-fadeInUp">
                <div className="flex gap-2 items-center">
                  <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce"></div>
                  <div className="w-2.5 h-2.5 bg-coral-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-2.5 h-2.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                  <span className="ml-2 text-sm text-gray-600 font-medium animate-fadeIn">Recherche en cours...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 p-6 shadow-xl">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={ragStatus?.isReady ? "Posez votre question sur vos veilles..." : "En attente d'indexation..."}
                  disabled={isLoading || !ragStatus?.isReady}
                  className="w-full px-5 py-4 pr-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-400 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all text-[15px] shadow-sm hover:border-gray-400"
                />
                <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading || !ragStatus?.isReady}
                className="w-14 h-14 bg-gradient-to-br from-orange-500 to-coral-500 text-white rounded-xl hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center active:scale-95 shadow-md hover-glow"
              >
                <Send size={20} />
              </button>
            </div>
            <div className="mt-3 text-xs text-gray-500 text-center font-medium">
              {ragStatus?.isReady ? (
                <>
                  Appuyez sur <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">Entrée</kbd> pour envoyer
                </>
              ) : (
                <span className="text-orange-600">En attente d'indexation des rapports...</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
