import React, { useCallback, useEffect, useRef, useState } from 'react';
import { 
  Building2, 
  ChevronDown, 
  Lock, 
  Send, 
  Smartphone, 
  Sparkles, 
  CheckCheck, 
  RefreshCw,
  X
} from 'lucide-react';
import { 
  fetchSimulatorProperties, 
  fetchSimulatorMessages, 
  sendSimulatorMessage, 
  type SimulatorProperty, 
  type SimulatorMessage 
} from '../api/simulator';

const QUICK_PROMPTS = [
  { label: 'WiFi', text: 'Bonjour, quel est le code WiFi de la villa ?' },
  { label: 'Piscine', text: 'Bonjour, est-ce que la piscine est chauffée ?' },
  { label: 'Check-out', text: 'À quelle heure doit-on libérer la villa demain ?' },
  { label: 'Panne Clim', text: 'Bonjour, la climatisation du salon ne fonctionne plus, pouvez-vous envoyer un technicien ?' },
];

const DEFAULT_GUEST_PHONE = '+216 98 123 456';

export const GuestWhatsAppSimulatorPage: React.FC = () => {
  const [properties, setProperties] = useState<SimulatorProperty[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>(() => {
    return localStorage.getItem('vayca_sim_guest_phone') || DEFAULT_GUEST_PHONE;
  });
  const [messages, setMessages] = useState<SimulatorMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneInputValue, setPhoneInputValue] = useState(guestPhone);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  // 1. Load available properties
  useEffect(() => {
    let mounted = true;
    async function loadProperties() {
      try {
        setLoading(true);
        setError(null);
        const props = await fetchSimulatorProperties();
        if (mounted) {
          setProperties(props);
          if (props.length > 0) {
            setSelectedPropertyId((prev) => prev || props[0].id);
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Impossible de contacter le simulateur Vayca. Vérifiez que le mode simulateur est actif.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadProperties();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Fetch and poll conversation messages
  const loadMessages = useCallback(async (isPolling = false) => {
    if (!selectedPropertyId || !guestPhone) return;
    try {
      const chat = await fetchSimulatorMessages(selectedPropertyId, guestPhone);
      setMessages(chat);
      // If we were waiting for an AI reply and a new outbound message arrived, stop typing indicator
      const lastMsg = chat[chat.length - 1];
      if (lastMsg && lastMsg.direction === 'outbound') {
        setIsTyping(false);
      }
    } catch (err) {
      if (!isPolling) {
        console.error('Failed to load chat messages:', err);
      }
    }
  }, [selectedPropertyId, guestPhone]);

  useEffect(() => {
    void loadMessages(false);
    const interval = setInterval(() => {
      void loadMessages(true);
    }, 1500);
    return () => clearInterval(interval);
  }, [loadMessages]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || !selectedPropertyId || sending) return;

    setInputText('');
    setSending(true);
    setIsTyping(true);

    try {
      await sendSimulatorMessage(selectedPropertyId, guestPhone, text);
      await loadMessages(false);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi du message.");
      setIsTyping(false);
    } finally {
      setSending(false);
    }
  };

  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phoneInputValue.trim() || DEFAULT_GUEST_PHONE;
    setGuestPhone(clean);
    localStorage.setItem('vayca_sim_guest_phone', clean);
    setIsPhoneModalOpen(false);
  };

  return (
    <div className="flex h-screen flex-col bg-[#EFEAE2] font-sans antialiased select-none text-[#111B21]">
      
      {/* 1. WhatsApp Dark Green Header */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between bg-[#075E54] px-3 text-white shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#128C7E] text-white font-bold shadow-inner">
            <Building2 className="h-5 w-5" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#25D366] ring-2 ring-[#075E54]" />
          </div>

          <div className="min-w-0 flex flex-col">
            <button
              type="button"
              onClick={() => setIsPropertyModalOpen(true)}
              className="flex items-center gap-1.5 text-left group"
            >
              <h1 className="truncate text-sm font-semibold tracking-tight text-white group-hover:underline">
                {selectedProperty?.name || 'Villa Vayca'}
              </h1>
              <ChevronDown className="h-4 w-4 shrink-0 text-white/80 group-hover:text-white" />
            </button>
            <div className="flex items-center gap-1.5 text-[11px] text-[#25D366] font-medium leading-none">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#25D366] animate-pulse" />
              <span>en ligne</span>
              {selectedProperty?.city && (
                <span className="text-white/70">· {selectedProperty.city}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Header: Phone Identifier & Refresh */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsPhoneModalOpen(true)}
            title="Changer de numéro de téléphone"
            className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/90 hover:bg-white/20 transition-colors"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline font-mono text-[11px]">{guestPhone}</span>
          </button>
          <button
            type="button"
            onClick={() => void loadMessages(false)}
            title="Rafraîchir"
            className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Error Alert if simulator unavailable */}
      {error && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-700 flex items-center justify-between">
          <p className="truncate">{error}</p>
          <button type="button" onClick={() => setError(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* 2. WhatsApp Chat Canvas */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[#EFEAE2]">
        
        {/* End-to-End Simulation Notice */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFEECD] px-3 py-1.5 text-center text-[11px] text-[#54656F] shadow-sm max-w-sm">
            <Lock className="h-3 w-3 shrink-0 text-[#856404]" />
            <span>Simulateur WhatsApp Vayca — Connecté au moteur IA et à l'espace de gestion.</span>
          </div>
        </div>

        {/* Empty State */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="h-12 w-12 rounded-full bg-white/60 flex items-center justify-center text-[#075E54] shadow-sm mb-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-sm font-bold text-[#111B21]">Discutez avec {selectedProperty?.name}</h2>
            <p className="mt-1 text-xs text-[#54656F] max-w-xs">
              Posez des questions sur le WiFi, les horaires de check-in/out, la piscine, ou signalez un besoin d'assistance.
            </p>
          </div>
        )}

        {/* Message Bubbles */}
        {messages.map((msg) => {
          const isGuest = msg.direction === 'inbound';
          const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div
              key={msg.id}
              className={`flex ${isGuest ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 shadow-[0_1px_1.5px_rgba(11,20,26,0.13)] ${
                  isGuest 
                    ? 'bg-[#D9FDD3] rounded-tr-xs text-[#111B21]' 
                    : 'bg-white rounded-tl-xs text-[#111B21]'
                }`}
              >
                {/* Source Badge for Outbound replies */}
                {!isGuest && (
                  <div className="mb-1 flex items-center gap-1 text-[10px] font-bold">
                    {msg.sender_type === 'staff' ? (
                      <span className="rounded bg-[#F0F6FA] px-1.5 py-0.5 text-[#0F3D5E] border border-[#B6DAEA]">
                        👤 Équipe Vayca
                      </span>
                    ) : (
                      <span className="rounded bg-[#E7F8EE] px-1.5 py-0.5 text-[#075E54] border border-[#A8E4C7]">
                        🤖 IA Vayca
                      </span>
                    )}
                  </div>
                )}

                {/* Message Body */}
                <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                  {msg.content}
                </p>

                {/* Message Footer: Timestamp + Checkmarks */}
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#667781]">
                  <span>{time}</span>
                  {isGuest && (
                    <CheckCheck className="h-3.5 w-3.5 text-[#53BDEB]" />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-tl-xs bg-white px-3.5 py-2.5 shadow-sm text-xs text-[#54656F]">
              <span className="h-2 w-2 rounded-full bg-[#075E54] animate-bounce" />
              <span className="h-2 w-2 rounded-full bg-[#075E54] animate-bounce [animation-delay:0.2s]" />
              <span className="h-2 w-2 rounded-full bg-[#075E54] animate-bounce [animation-delay:0.4s]" />
              <span className="ml-1 text-[11px] font-medium text-[#54656F]">L'assistant Vayca rédige...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* 3. Quick Prompt Chips */}
      <div className="border-t border-[#E0DCD5] bg-[#F0F2F5] px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold text-[#54656F] uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#075E54]" /> Suggestions :
          </span>
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt.label}
              type="button"
              onClick={() => void handleSendMessage(prompt.text)}
              disabled={sending}
              className="shrink-0 rounded-full border border-[#D1D7DB] bg-white px-3 py-1 text-xs font-medium text-[#111B21] shadow-2xs hover:bg-[#F5F6F6] hover:border-[#075E54] active:scale-95 transition-all"
            >
              {prompt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Bottom WhatsApp Input Bar */}
      <footer className="sticky bottom-0 z-30 bg-[#F0F2F5] px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Tapez un message..."
            disabled={sending}
            className="flex-1 rounded-2xl border-none bg-white px-4 py-2.5 text-sm text-[#111B21] placeholder-[#8696A0] shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#075E54]"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            aria-label="Envoyer"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00A884] text-white shadow-md hover:bg-[#069C7B] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </footer>

      {/* Property Selection Modal */}
      {isPropertyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between border-b border-[#EBE6DD] pb-2">
              <h2 className="text-sm font-bold text-[#111B21] flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#075E54]" />
                Choisir une villa à contacter
              </h2>
              <button
                type="button"
                onClick={() => setIsPropertyModalOpen(false)}
                className="rounded-lg p-1 text-[#54656F] hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-60 space-y-1.5 overflow-y-auto">
              {properties.map((prop) => (
                <button
                  key={prop.id}
                  type="button"
                  onClick={() => {
                    setSelectedPropertyId(prop.id);
                    setIsPropertyModalOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    prop.id === selectedPropertyId
                      ? 'bg-[#E7F8EE] text-[#075E54] font-semibold'
                      : 'hover:bg-gray-50 text-[#111B21]'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate">{prop.name}</p>
                    {prop.city && <p className="text-xs text-[#54656F] font-normal">{prop.city}</p>}
                  </div>
                  {prop.id === selectedPropertyId && (
                    <span className="h-2 w-2 rounded-full bg-[#25D366]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Guest Phone Modal */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between border-b border-[#EBE6DD] pb-2">
              <h2 className="text-sm font-bold text-[#111B21] flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-[#075E54]" />
                Votre numéro de voyageur
              </h2>
              <button
                type="button"
                onClick={() => setIsPhoneModalOpen(false)}
                className="rounded-lg p-1 text-[#54656F] hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSavePhone} className="space-y-3">
              <p className="text-xs text-[#54656F]">
                Indiquez le numéro de téléphone utilisé pour identifier votre échange dans la boîte de réception Vayca.
              </p>
              <input
                type="text"
                value={phoneInputValue}
                onChange={(e) => setPhoneInputValue(e.target.value)}
                placeholder="+216 98 123 456"
                className="w-full rounded-xl border border-[#D1D7DB] px-3 py-2 text-sm font-mono focus:border-[#075E54] focus:outline-hidden"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPhoneModalOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-[#54656F] hover:bg-gray-100 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#075E54] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#064E46]"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
