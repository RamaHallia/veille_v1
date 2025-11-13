import { useState, useEffect, useRef, startTransition } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Sparkles, Trash2, X, Edit3 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  isTyping?: boolean;
}

interface Suggestion {
  label: string;
  value: string;
  description?: string;
  icon?: string;
  format?: string;
}

interface ChatInterfaceProps {
  onNavigateToDashboard?: () => void;
}

export default function ChatInterface({ onNavigateToDashboard }: ChatInterfaceProps) {
  const { user, signOut } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [typingMessage, setTypingMessage] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isLastStep, setIsLastStep] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);

  useEffect(() => {
    // Afficher le message de bienvenue au démarrage (en local uniquement)
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: `Salut ! 😊

Je vais t'aider à configurer ta veille concurrentielle.

Pour commencer, donne-moi ton prénom, ton email et ton numéro de téléphone.
(tu peux tout envoyer d'un coup ou séparément)`,
        created_at: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [typingMessage, isTyping]);

  // Scroller quand les suggestions apparaissent pour éviter qu'elles cachent les messages
  useEffect(() => {
    if (suggestions.length > 0) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [suggestions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputMessage]);

  // Animation typing effect
  const typeMessage = (text: string, callback?: () => void) => {
    if (!text || text.length === 0) {
      if (callback) callback();
      return () => {};
    }

    setIsTyping(true);
    setTypingMessage(''); // Réinitialiser
    let i = 0;
    const speed = 15; // vitesse de frappe en ms

    // Afficher la première lettre immédiatement
    setTypingMessage(text.charAt(0));
    i = 1;
    scrollToBottom();

    // Si le texte n'a qu'un seul caractère
    if (text.length === 1) {
      setIsTyping(false);
      if (callback) callback();
      return () => {};
    }

    // Continuer avec le reste du texte
    const typing = setInterval(() => {
      if (i < text.length) {
        const nextChar = text.charAt(i);
        setTypingMessage((prev) => prev + nextChar);
        i++;
        // Scroller pendant l'animation pour suivre le texte
        requestAnimationFrame(() => scrollToBottom());
      } else {
        clearInterval(typing);
        setIsTyping(false);
        // Scroll final après l'animation
        setTimeout(() => scrollToBottom(), 50);
        if (callback) callback();
      }
    }, speed);

    // Cleanup function
    return () => clearInterval(typing);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    // Ajouter la suggestion au lieu de remplacer
    const currentMessage = inputMessage.trim();

    if (currentMessage) {
      // Si il y a déjà du texte, ajouter avec une virgule
      setInputMessage(currentMessage + ', ' + suggestion.value);
    } else {
      // Sinon, juste mettre la suggestion
      setInputMessage(suggestion.value);
    }

    // Optionnel : envoyer automatiquement
    // sendMessage();
  };

  const clearMessages = () => {
    const confirmClear = window.confirm(
      'Êtes-vous sûr de vouloir recommencer la configuration depuis le début ?'
    );

    if (!confirmClear) return;

    // Effacer les messages localement et afficher le message de bienvenue
    const welcomeMessage: Message = {
      id: 'welcome-' + Date.now(),
      role: 'assistant',
      content: `Salut ! 😊

Je vais t'aider à configurer ta veille concurrentielle.

Pour commencer, donne-moi ton prénom, ton email et ton numéro de téléphone.
(tu peux tout envoyer d'un coup ou séparément)`,
      created_at: new Date().toISOString(),
    };

    setMessages([welcomeMessage]);
    setSuggestions([]);
    setTypingMessage('');
    setIsTyping(false);
    setIsLastStep(false);

    console.log('✅ Configuration redémarrée');
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setSuggestions([]); // Clear suggestions

    // 1. Afficher immédiatement le message utilisateur (en local)
    const tempUserMessage: Message = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await fetch('https://n8n.srv954650.hstgr.cloud/webhook/AgentIA', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          user_id: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la communication avec l\'assistant');
      }

      const data = await response.json();
      
      console.log('🔍 Réponse brute n8n:', data);
      
      // Parser la réponse qui peut contenir du JSON dans un bloc markdown
      let parsedData = data;
      let assistantResponse = data.output || data.message || '';
      
      console.log('📝 Assistant response brut:', assistantResponse);
      
      // Essayer de parser la réponse si c'est du JSON
      if (typeof assistantResponse === 'string') {
        // Cas 1 : JSON entouré de ```json ... ```
        if (assistantResponse.includes('```json')) {
          const jsonMatch = assistantResponse.match(/```json\n?([\s\S]*?)\n?```/);
          if (jsonMatch) {
            try {
              const jsonString = jsonMatch[1].trim();
              console.log('📋 JSON extrait des backticks:', jsonString);
              parsedData = JSON.parse(jsonString);
              assistantResponse = parsedData.message_utilisateur || assistantResponse;
              console.log('✅ Parsing réussi (backticks)');
            } catch (e) {
              console.error('❌ Erreur de parsing JSON (backticks):', e);
            }
          }
        }
        // Cas 2 : JSON direct commençant par {
        else if (assistantResponse.trim().startsWith('{')) {
          try {
            console.log('📋 Tentative de parsing JSON direct');
            parsedData = JSON.parse(assistantResponse);
            assistantResponse = parsedData.message_utilisateur || assistantResponse;
            console.log('✅ Parsing réussi (JSON direct)');
          } catch (e) {
            console.error('❌ Erreur de parsing JSON direct:', e);
          }
        }
        // Cas 3 : Contient des \n échappés
        else if (assistantResponse.includes('\\n')) {
          try {
            console.log('📋 Détection de \\n échappés, nettoyage...');
            // Remplacer les \n par de vrais retours à la ligne
            const cleaned = assistantResponse.replace(/\\n/g, '\n');
            // Essayer d'extraire le JSON
            const jsonMatch = cleaned.match(/```json\n?([\s\S]*?)\n?```/) || cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const jsonString = jsonMatch[1] || jsonMatch[0];
              console.log('📋 JSON nettoyé:', jsonString);
              parsedData = JSON.parse(jsonString);
              assistantResponse = parsedData.message_utilisateur || assistantResponse;
              console.log('✅ Parsing réussi (nettoyé)');
            }
          } catch (e) {
            console.error('❌ Erreur de parsing JSON (nettoyé):', e);
          }
        }
      }
      
      console.log('💬 Message final:', assistantResponse);
      console.log('📦 Données parsées:', parsedData);

      // 2. Démarrer l'animation typing pour la réponse
      setIsLoading(false);

      // Stocker les suggestions pour les afficher après l'animation
      const suggestionsToShow = parsedData.suggestions && Array.isArray(parsedData.suggestions)
        ? parsedData.suggestions
        : [];

      // Détecter si c'est la dernière étape (question sur les alertes en temps réel)
      const isLastQuestion = assistantResponse.toLowerCase().includes('alertes en temps réel') ||
                            assistantResponse.toLowerCase().includes('dernière étape');

      if (isLastQuestion) {
        console.log('🎯 Dernière étape détectée !');
        setIsLastStep(true);
      }

      typeMessage(assistantResponse, () => {
        // Utiliser startTransition pour une transition fluide
        startTransition(() => {
          // Ajouter le message final à l'état (en local)
          const finalMessage: Message = {
            id: 'assistant-' + Date.now(),
            role: 'assistant',
            content: assistantResponse,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, finalMessage]);
          setTypingMessage(''); // Effacer le message typing
        });

        // Afficher les suggestions APRÈS l'animation avec un délai
        setTimeout(() => {
          console.log('🎯 Affichage des suggestions après animation...');
          startTransition(() => {
            if (suggestionsToShow.length > 0) {
              console.log(`✅ ${suggestionsToShow.length} suggestions trouvées!`);
              setSuggestions(suggestionsToShow);
            } else {
              console.log('❌ Aucune suggestion trouvée');
              setSuggestions([]);
            }
          });
        }, 200);
      });

      // Vérifier si l'onboarding est terminé
      const config = parsedData.config || data.config || {};
      if (config.status === 'done' || config.route === 'completed') {
        console.log('🎉 Configuration terminée ! Redirection vers le tableau de bord...');

        // Redirection après 5 secondes (pour laisser l'utilisateur lire le message de l'agent)
        setTimeout(() => {
          if (onNavigateToDashboard) {
            onNavigateToDashboard();
          }
        }, 5000);
      }
    } catch (error) {
      console.error('Error calling n8n webhook:', error);
      setIsLoading(false);

      // Si c'était la dernière étape et qu'il y a une erreur (workflow terminé)
      // On envoie quand même le message de félicitations
      if (isLastStep) {
        console.log('🎉 Dernière étape terminée, envoi du message de félicitations...');

        const congratsMessage = '🎉 Parfait ! Votre configuration est bien enregistrée. Vous allez être redirigé vers votre tableau de bord dans quelques instants...';

        typeMessage(congratsMessage, () => {
          // Ajouter le message à l'état (en local)
          startTransition(() => {
            const finalMessage: Message = {
              id: 'congrats-' + Date.now(),
              role: 'assistant',
              content: congratsMessage,
              created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, finalMessage]);
            setTypingMessage('');
          });

          // Redirection après 4 secondes
          setTimeout(() => {
            console.log('🚀 Redirection vers le tableau de bord...');
            if (onNavigateToDashboard) {
              onNavigateToDashboard();
            }
          }, 4000);
        });

        return;
      }

      // Message d'erreur (en local)
      const errorMsg = 'Désolé, une erreur s\'est produite. Veuillez réessayer.';
      const errorMessage: Message = {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: errorMsg,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-orange-50/30 via-peach-50 to-orange-100/40">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && !isTyping && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="bg-gradient-to-br from-orange-500 to-coral-500 p-4 rounded-2xl mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Commencez une conversation</h3>
                  <p className="text-gray-600 max-w-md">Posez-moi des questions sur votre veille, les tendances du marché ou vos concurrents.</p>
                </div>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  } animate-fadeIn`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}>
                    <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-orange-500 to-coral-500 text-white font-bold text-sm'
                        : 'bg-white border-2 border-orange-200'
                    }`}>
                      {message.role === 'user' ? (
                        user?.email?.[0].toUpperCase()
                      ) : (
                        <Sparkles size={18} className="text-orange-500" />
                      )}
                    </div>
                    <div
                      className={`rounded-2xl px-5 py-3.5 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-orange-500 to-coral-500 text-white'
                          : 'bg-white text-gray-900 border border-orange-100'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">
                        {message.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Message en cours de frappe */}
              {isTyping && (
                <div className="flex justify-start animate-fadeIn">
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-white border-2 border-orange-200">
                      <Sparkles size={18} className="text-orange-500" />
                    </div>
                    <div className="bg-white border border-orange-100 rounded-2xl px-5 py-3.5 shadow-sm">
                      <div className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">
                        {typingMessage}
                        <span className="inline-block w-[3px] h-[18px] bg-orange-500 ml-1 animate-pulse"></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Indicateur de chargement */}
              {isLoading && !isTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-white border-2 border-orange-200">
                      <Sparkles size={18} className="text-orange-500" />
                    </div>
                    <div className="bg-white border border-orange-100 rounded-2xl px-5 py-3.5 shadow-sm">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white/95 backdrop-blur-sm border-t border-orange-100 p-6 shadow-lg">
              <div className="max-w-4xl mx-auto">
                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="mb-4 animate-fadeIn">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-semibold text-gray-700">Suggestions pour vous</span>
                    </div>

                    {/* Tooltip d'aide */}
                    {showTooltip && (
                      <div className="mb-3 bg-gradient-to-r from-orange-100 to-coral-100 border-2 border-orange-300 rounded-xl p-4 shadow-md animate-slideInRight relative">
                        <button
                          onClick={() => setShowTooltip(false)}
                          className="absolute top-2 right-2 text-orange-600 hover:text-orange-700 transition-colors"
                          title="Fermer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="flex items-start gap-3">
                          <div className="bg-orange-500 p-2 rounded-lg flex-shrink-0">
                            <Edit3 className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 pr-6">
                            <h4 className="text-sm font-bold text-orange-900 mb-1">
                              💡 Astuce
                            </h4>
                            <p className="text-xs text-orange-800 leading-relaxed">
                              Vous pouvez <strong>choisir une suggestion</strong> ou <strong>écrire votre propre réponse</strong> dans le champ ci-dessous. Les suggestions sont là pour vous aider, mais vous êtes libre de personnaliser votre réponse !
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          disabled={isLoading || isTyping}
                          className="group relative px-4 py-3 bg-gradient-to-br from-orange-50 to-orange-100/50 hover:from-orange-100 hover:to-orange-200/50 text-left rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-orange-200/50 hover:border-orange-300 hover:shadow-md active:scale-[0.98]"
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <div className="text-orange-900 font-semibold mb-0.5 text-[13px]">
                                {suggestion.label}
                              </div>
                              {suggestion.description && (
                                <div className="text-orange-700/70 text-xs line-clamp-1">
                                  {suggestion.description}
                                </div>
                              )}
                            </div>
                            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                                <Send size={12} className="text-white" />
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Posez votre question..."
                      disabled={isLoading || isTyping}
                      rows={1}
                      className="w-full px-5 py-4 border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50 transition-all resize-none max-h-[200px] overflow-y-auto"
                      style={{ minHeight: '56px' }}
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isLoading || isTyping}
                    className="flex-shrink-0 w-14 h-14 bg-gradient-to-r from-orange-500 to-coral-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium active:scale-95"
                  >
                    <Send size={22} />
                  </button>
                </div>
                <div className="mt-2 text-xs text-gray-500 text-center">
                  Appuyez sur Entrée pour envoyer, Maj+Entrée pour nouvelle ligne
                </div>
              </div>
            </div>
        </div>
      </div>
    );
  }
