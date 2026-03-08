"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { socket } from '@/lib/socket';
import { Globe, Send, MoreHorizontal, Check, RefreshCcw, Smile, Languages, Bell, Settings, Mic, MicOff, AlertCircle, Volume2, VolumeX, Phone, PhoneOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' }
];

export default function ChatInterface() {
  const { language, setLanguage, addMessage, messages, connected, setConnected, userId, setUserId, partnerTyping, setPartnerTyping } = useChatStore();
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [previewTranslation, setPreviewTranslation] = useState<string | null>(null);
  const [ambiguityWarning, setAmbiguityWarning] = useState<{ isAmbiguous: boolean; suggestedPhrasing: string | null } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState(true);
  const [isCallMode, setIsCallMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const stateRef = useRef({ language, autoSpeechEnabled, isCallMode, isSpeaking });

  useEffect(() => {
    stateRef.current = { language, autoSpeechEnabled, isCallMode, isSpeaking };
  }, [language, autoSpeechEnabled, isCallMode, isSpeaking]);

  const playTextToSpeech = useCallback(async (text: string, langCode: string) => {
    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
    if (apiKey) {
      setIsSpeaking(true);
      try {
        const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel's voice ID, good default
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          })
        });
        
        if (!response.ok) {
           console.error('ElevenLabs API error', await response.text());
           setIsSpeaking(false);
           return;
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        audio.play();
      } catch (err) {
        console.error(err);
        setIsSpeaking(false);
      }
    } else {
      // Fallback to browser TTS if no ElevenLabs key is present
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode === 'en' ? 'en-US' : langCode === 'es' ? 'es-ES' : 'fr-FR';
      utterance.rate = 0.9; 
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    if (!userId) {
      setUserId(`user_${Math.floor(Math.random() * 10000)}`);
    }
  }, [userId, setUserId]);

  useEffect(() => {
    if (!isMounted || !userId) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join', { userId, language });

    const onJoined = () => setConnected(true);
    const onNewMessage = (data: any) => {
      addMessage({ ...data, isSelf: false });
      if (stateRef.current.autoSpeechEnabled) {
         playTextToSpeech(data.translatedText || data.originalText, stateRef.current.language);
      }
    };
    const onMessageDelivered = (data: any) => addMessage({ ...data, isSelf: true });
    const onUserTyping = () => {
      setPartnerTyping(true);
      setTimeout(() => setPartnerTyping(false), 2000);
    };

    socket.on('joined', onJoined);
    socket.on('new_message', onNewMessage);
    socket.on('message_delivered', onMessageDelivered);
    socket.on('user_typing', onUserTyping);

    return () => {
      socket.off('joined', onJoined);
      socket.off('new_message', onNewMessage);
      socket.off('message_delivered', onMessageDelivered);
      socket.off('user_typing', onUserTyping);
    };
  }, [language, userId, addMessage, setConnected, setPartnerTyping, playTextToSpeech]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  useEffect(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    if (inputText.length > 10) {
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('check_ambiguity', { text: inputText, sourceLang: language }, (res: any) => {
          if (res && res.isAmbiguous) {
            setAmbiguityWarning(res);
          } else {
            setAmbiguityWarning(null);
          }
        });
      }, 1000); // 1s debounce
    } else {
      setAmbiguityWarning(null);
    }
    
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [inputText, language]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    socket.emit('typing');
  };

  const handleSend = () => {
    if (!inputText.trim() || isSending) return;

    setIsSending(true);
    socket.emit('sendMessage', {
      text: inputText,
      senderLanguage: language
    });
    
    setInputText('');
    setPreviewTranslation(null);
    setAmbiguityWarning(null);

    // Let UI reflect disabled send momentarily then let back inputs
    setTimeout(() => setIsSending(false), 300);
  };

  const toggleCallMode = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition isn't supported in your browser.");
      return;
    }
    setIsCallMode(!isCallMode);
  };

  useEffect(() => {
    let recognition: any = null;
    let shouldRestart = true;

    if (isCallMode && !isSpeaking) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      recognition = new SpeechRecognition();
      recognition.lang = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = () => setIsListening(true);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        if (transcript.trim()) {
           socket.emit('sendMessage', {
             text: transcript.trim(),
             senderLanguage: language
           });
           socket.emit('typing');
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setIsCallMode(false);
          shouldRestart = false;
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (shouldRestart && stateRef.current.isCallMode && !stateRef.current.isSpeaking) {
           setTimeout(() => {
             if (shouldRestart && stateRef.current.isCallMode && !stateRef.current.isSpeaking) {
                try { recognition.start(); } catch(e) {}
             }
           }, 200);
        }
      };

      try {
        recognition.start();
      } catch (e) { }
    } else {
      setIsListening(false);
    }

    return () => {
      shouldRestart = false;
      if (recognition) {
        recognition.onend = null;
        try { recognition.abort(); } catch(e) {}
      }
    };
  }, [isCallMode, isSpeaking, language]);

  if (!isMounted || !userId) return null;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative font-sans text-slate-800 dark:text-slate-200">

      {/* Header */}
      <div className="w-full flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-950 shadow-sm z-10 shrink-0 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xl font-bold hover:scale-105 transition-transform cursor-pointer">
              {userId.slice(-2)}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-950"></div>
          </div>
          <div>
            <h2 className="font-semibold text-lg flex items-center">
              Global Connect 
              {connected ? <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Active</span> : <span className="ml-2 text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">Connecting...</span>}
            </h2>
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <Globe className="w-3 h-3" /> Auto-Translating live
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700">
            <Languages className="w-4 h-4 text-slate-500 ml-2" />
            <select 
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                socket.emit('join', { userId, language: e.target.value });
              }}
              className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer outline-none ml-2 pr-4 text-slate-700 dark:text-slate-300"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full"><Settings className="w-5 h-5" /></Button>
        </div>
      </div>

      {/* AI Avatar Display */}
      <div className="flex flex-col items-center justify-center pt-6 pb-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 shadow-sm z-0 relative">
        <div className="absolute inset-0 bg-indigo-50/50 dark:bg-indigo-900/10 pointer-events-none" />
        <div className={`relative w-28 h-28 rounded-full overflow-hidden border-4 transition-all duration-300 ${isListening ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)] scale-110' : isSpeaking ? 'border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)] scale-105 animate-pulse' : 'border-slate-200 dark:border-slate-700'}`}>
          <img 
            src="/avatar.png" 
            alt="AI Avatar" 
            className="w-full h-full object-cover bg-white" 
            onError={(e) => { e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=e2e8f0'; }} 
          />
        </div>
        <div className="flex flex-col items-center gap-3 mt-4 z-10">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest text-center">
            {isCallMode ? (isSpeaking ? "Translating Audio..." : isListening ? "Listening..." : "Waiting...") : "AI Avatar Standby"}
          </p>
          
          <div className="flex items-center gap-4">
            <Button
              onClick={toggleCallMode}
              className={`h-12 w-12 rounded-full flex items-center justify-center p-0 transition-all shadow-md z-10 ${
                isCallMode 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/40 animate-pulse scale-110' 
                  : 'bg-green-500 hover:bg-green-600 text-white hover:scale-105 shadow-green-500/30'
              }`}
            >
              {isCallMode ? <PhoneOff className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setAutoSpeechEnabled(!autoSpeechEnabled)}
              className={`h-10 text-xs rounded-full px-4 shadow-sm border transition-colors ${autoSpeechEnabled ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'}`}
            >
              {autoSpeechEnabled ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
              {autoSpeechEnabled ? "Auto-Speak: ON" : "Auto-Speak: OFF"}
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex justify-center">
          <span className="text-xs font-medium px-3 py-1 bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 rounded-full backdrop-blur-sm">
            End-to-End Encrypted & Translated
          </span>
        </div>
        
        {messages.map((msg, idx) => {
          const isSender = msg.isSelf;
          const showOrig = showOriginal[msg.id] || false;
          
          return (
            <div key={idx} className={`flex flex-col max-w-[85%] ${isSender ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
              
              {!isSender && (
                <div className="flex items-center space-x-2 mb-1 ml-1 text-xs text-slate-500">
                  <span className="uppercase tracking-wider font-semibold opacity-70">Partner ({msg.senderLanguage})</span>
                </div>
              )}
              
              <div 
                className={`relative px-5 py-3.5 shadow-sm 
                ${isSender 
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl rounded-tr-sm' 
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm'}`}
              >
                
                {/* Cultural Clarification Alert */}
                {msg.clarification && !isSender && (
                  <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs rounded-lg flex items-start gap-2 border border-amber-200 dark:border-amber-800/50">
                    <Globe className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span><strong className="font-semibold block mb-0.5">Cultural Context:</strong> {msg.clarification}</span>
                  </div>
                )}
                
                <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
                  {isSender ? msg.originalText : msg.translatedText}
                </p>

                {/* Receiver View: Toggle original text */}
                {!isSender && msg.senderLanguage !== language && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-col items-start gap-1">
                    <button 
                      onClick={() => setShowOriginal(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                      className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 transition-colors flex items-center gap-1"
                    >
                      {showOrig ? 'Hide Original' : 'View Original'}
                    </button>
                    
                    {showOrig && (
                      <p className="text-sm italic opacity-70 mt-1 pb-1 transition-all duration-300">
                        {msg.originalText}
                      </p>
                    )}
                  </div>
                )}

              </div>
              
              <div className="flex items-center mt-1.5 space-x-2 text-[11px] text-slate-400 px-1">
                <span>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                {isSender && <Check className="w-3 h-3 text-indigo-400" />}
                {!isSender && (
                  <button 
                    onClick={() => playTextToSpeech(msg.translatedText || msg.originalText, language)}
                    className="hover:text-indigo-500 transition-colors ml-2 flex items-center gap-1"
                    title="Read aloud"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Typing indicator */}
        {partnerTyping && (
          <div className="flex max-w-[85%] mr-auto items-start">
             <div className="px-5 py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
               <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
               <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800">
        
        {/* Preview Bar */}
        {previewTranslation && (
           <div className="mb-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm flex items-center gap-2 border border-indigo-100 dark:border-indigo-800/50">
             <RefreshCcw className="w-4 h-4 animate-spin-slow opacity-70" />
             <span className="opacity-80 font-medium">Auto-translation:</span> 
             <span className="italic">{previewTranslation}</span>
           </div>
        )}

        {/* Ambiguity Warning */}
        {ambiguityWarning && ambiguityWarning.isAmbiguous && (
          <div className="mb-3 px-4 py-2 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-lg text-sm flex flex-col gap-1 border border-amber-200 dark:border-amber-800/50">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="font-semibold">Your message might be ambiguous or overly direct.</span>
            </div>
            {ambiguityWarning.suggestedPhrasing && (
              <div className="ml-6 mt-1 flex flex-col gap-1">
                <span className="opacity-80">Suggested phrasing:</span>
                <button 
                  onClick={() => {
                    setInputText(ambiguityWarning.suggestedPhrasing || '');
                    setAmbiguityWarning(null);
                  }}
                  className="text-left italic bg-white/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors border border-amber-200/50"
                >
                  "{ambiguityWarning.suggestedPhrasing}"
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center space-x-2 max-w-5xl mx-auto relative group">
          <Button variant="ghost" size="icon" className="absolute left-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full h-10 w-10">
            <Smile className="w-5 h-5" />
          </Button>
          
          <Input 
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Type a message in ${LANGUAGES.find(l => l.code === language)?.label}...`}
            className="flex-1 py-6 pl-12 pr-24 rounded-full border-slate-200 focus-visible:ring-indigo-500 shadow-sm transition-all focus-within:shadow-md bg-white dark:bg-slate-950 dark:border-slate-700 text-base"
          />
          
          <div className="absolute right-1.5 flex items-center space-x-1">
            <Button 
              onClick={handleSend}
              disabled={!inputText.trim() || isSending}
              className="h-10 w-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center justify-center p-0 disabled:opacity-50 transition-all active:scale-95"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </div>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-2 tracking-wide uppercase font-semibold">
          AI Translation • Privacy First • Real-Time
        </p>
      </div>
      
    </div>
  );
}
