import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Bot, User, FileText, Calendar, Sparkles, MessageSquarePlus, MessageSquare, Menu, X, Trash2 } from 'lucide-react';
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

interface Conversation {
  id: string;
  titre: string;
  dernier_message_at: string;
  nb_messages: number;
  created_at: string;
}

interface RAGChatPageProps {
  onBack?: () => void;
}

export default function RAGChatPage({ onBack }: RAGChatPageProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Charger les conversations au démarrage
  useEffect(() => {
    if (user?.id) {
      loadConversations();
    }
  }, [user]);

  // Charger la liste des conversations
  const loadConversations = async () => {
    if (!user?.id) return;

    setIsLoadingConversations(true);
    try {
      const { data, error } = await supabase.rpc('list_user_conversations', {
        p_user_id: user.id,
        p_limit: 50
      });

      if (error) throw error;

      setConversations(data || []);
      console.log(`📋 Loaded ${data?.length || 0} conversations`);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // Charger une conversation spécifique
  const loadConversation = async (convId: string) => {
    setIsLoading(true);
    try {
      // Charger l'historique des messages
      const { data, error } = await supabase.rpc('get_conversation_history', {
        p_conversation_id: convId,
        p_limit: 100
      });

      if (error) throw error;

      // Convertir en format Message
      const loadedMessages: Message[] = (data || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        sources: msg.metadata?.sources || [],
        created_at: msg.created_at
      }));

      setMessages(loadedMessages);
      setConversationId(convId);
      console.log(`💬 Loaded conversation ${convId} with ${loadedMessages.length} messages`);
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    console.log('🔄 Nouvelle conversation démarrée');
  };

  // Supprimer une conversation
  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher le clic de charger la conversation

    const confirmDelete = window.confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?');
    if (!confirmDelete) return;

    try {
      // Supprimer tous les messages de la conversation (CASCADE devrait le faire automatiquement)
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', convId);

      if (error) throw error;

      console.log(`🗑️ Conversation ${convId} supprimée`);

      // Si c'est la conversation active, la réinitialiser
      if (conversationId === convId) {
        setConversationId(null);
        setMessages([]);
      }

      // Recharger la liste
      loadConversations();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de la conversation');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    console.log('📨 Envoi du message avec conversation_id:', conversationId || 'null (nouvelle conversation)');

    // Ajouter le message utilisateur
    const tempUserMessage: Message = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      // Appeler l'Edge Function RAG avec mémoire conversationnelle
      const { data, error } = await supabase.functions.invoke('rag-query', {
        body: {
          question: userMessage,
          user_id: user?.id,
          conversation_id: conversationId  // Envoyer l'ID de conversation pour la mémoire
        }
      });

      if (error) throw error;

      // TOUJOURS stocker le conversation_id retourné par l'API
      if (data.conversation_id) {
        if (!conversationId) {
          console.log('🆕 Nouvelle conversation créée:', data.conversation_id);
        } else {
          console.log('💬 Conversation existante:', data.conversation_id);
        }
        setConversationId(data.conversation_id);
        // Recharger la liste des conversations pour afficher/mettre à jour
        loadConversations();
      }

      // Ajouter la réponse de l'assistant
      const assistantMessage: Message = {
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Recharger la liste après chaque message pour mettre à jour les timestamps
      loadConversations();
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: 'Désolé, une erreur s\'est produite. Assurez-vous que vos rapports ont été indexés et que les Edge Functions sont déployées.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    "Quelles sont les dernières tendances dans mon secteur ?",
    "Résume les activités de mes concurrents ce mois-ci",
    "Quelles technologies émergentes sont mentionnées dans mes veilles ?",
    "Compare les stratégies de mes concurrents"
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-white border-r border-gray-200 flex flex-col overflow-hidden`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold text-gray-900">Conversations</h2>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Masquer la barre latérale"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Bouton Nouvelle Conversation (dans sidebar) */}
        <div className="p-3">
          <button
            onClick={startNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-coral-500 hover:from-orange-600 hover:to-coral-600 text-white rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md font-medium"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>Nouvelle conversation</span>
          </button>
        </div>

        {/* Liste des conversations */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoadingConversations ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Chargement...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Aucune conversation</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`relative group rounded-lg transition-all border-2 ${
                  conversationId === conv.id
                    ? 'bg-orange-50 border-orange-300'
                    : 'bg-white border-gray-200 hover:border-orange-200'
                }`}
              >
                <button
                  onClick={() => loadConversation(conv.id)}
                  className="w-full text-left p-3 pr-10"
                >
                  <div className="font-medium text-gray-900 text-sm truncate mb-1">
                    {conv.titre || 'Conversation sans titre'}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{conv.nb_messages} message{conv.nb_messages > 1 ? 's' : ''}</span>
                    <span>
                      {new Date(conv.dernier_message_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </span>
                  </div>
                </button>
                {/* Bouton supprimer (visible au hover) */}
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Supprimer cette conversation"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full relative">
        {/* Toggle sidebar button */}
        {!isSidebarOpen && (
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-3 bg-white hover:bg-orange-50 rounded-xl transition-all shadow-lg"
              title="Afficher les conversations"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        )}

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
                    Suggestions de questions :
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suggestedQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputMessage(question)}
                      className="stagger-item p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-orange-400 hover:shadow-lg text-left transition-all group hover:scale-[1.02] active:scale-[0.98] hover-lift"
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
                  placeholder="Posez votre question sur vos veilles..."
                  disabled={isLoading}
                  className="w-full px-5 py-4 pr-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-400 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all text-[15px] shadow-sm hover:border-gray-400"
                />
                <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="w-14 h-14 bg-gradient-to-br from-orange-500 to-coral-500 text-white rounded-xl hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center active:scale-95 shadow-md hover-glow"
              >
                <Send size={20} />
              </button>
            </div>
            <div className="mt-3 text-xs text-gray-500 text-center font-medium">
              Appuyez sur <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">Entrée</kbd> pour envoyer
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
