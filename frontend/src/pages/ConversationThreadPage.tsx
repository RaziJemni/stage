import React, { useState } from 'react';
import type { Conversation } from '../data/mockData';
import { 
  Bot, 
  UserCheck, 
  Send, 
  ArrowLeft, 
  Wifi, 
  Key
} from 'lucide-react';

interface ConversationThreadPageProps {
  conversation: Conversation;
  onBackToInbox: () => void;
  onToggleAIMode: (convId: string, currentMode: boolean) => void;
  onSendMessage: (convId: string, text: string) => void;
}

export const ConversationThreadPage: React.FC<ConversationThreadPageProps> = ({
  conversation,
  onBackToInbox,
  onToggleAIMode,
  onSendMessage
}) => {
  const [inputText, setInputText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(conversation.id, inputText);
    setInputText('');
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Top Header Navigation & Staff Takeover Control */}
      <div className="bg-white rounded-2xl border border-[#EBE6DD] p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBackToInbox}
            className="p-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F0F6FA] border border-[#EBE6DD] text-[#0F3D5E] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#1C1B18]">{conversation.guestName}</h1>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white ${
                conversation.channel === 'Airbnb' ? 'bg-[#FF5A5F]' :
                conversation.channel === 'Booking.com' ? 'bg-[#003580]' :
                'bg-[#0F3D5E]'
              }`}>
                {conversation.channel}
              </span>
            </div>
            <p className="text-xs text-[#78716C] mt-0.5">{conversation.propertyName}</p>
          </div>
        </div>

        {/* Staff Takeover Toggle Switch */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-[#1C1B18]">
              {conversation.aiMode ? 'Chatbot Simulator On' : 'Manual Reply Mode'}
            </div>
            <div className="text-[10px] text-[#78716C]">
              {conversation.aiMode ? 'Chatbot simulator active - review mode' : 'Chatbot paused for manual responses'}
            </div>
          </div>

          <button
            onClick={() => onToggleAIMode(conversation.id, conversation.aiMode)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${
              conversation.aiMode
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-[#D96B43] hover:bg-[#C25730] text-white'
            }`}
          >
            {conversation.aiMode ? (
              <>
                <Bot className="w-4 h-4 text-[#E8A838]" />
                <span>Chatbot Simulator On</span>
                <span className="text-[10px] font-normal underline ml-1">(Click to Take Over)</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 text-white" />
                <span>Staff Took Over (Manual)</span>
                <span className="text-[10px] font-normal underline ml-1">(Resume Chatbot)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Chat Thread (Left 8 Cols) vs Knowledge Side Panel (Right 4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Chat Thread Box (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#EBE6DD] shadow-sm flex flex-col h-[620px] overflow-hidden">
          
          {/* Thread Status Bar */}
          <div className="p-3 bg-[#FAF8F5] border-b border-[#EBE6DD] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-[#3B3735]">Reservation Confirmed</span>
            </div>
            <div className="text-[#78716C] text-[11px]">
              Guest ID: <span className="font-mono font-semibold">TN-8849-SA</span>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#FAF8F5]/30">
            {conversation.messages.map((msg) => {
              const isGuest = msg.sender === 'guest';
              const isAI = msg.sender === 'ai';
              const isStaff = msg.sender === 'staff';

              return (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${isGuest ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[11px] text-[#78716C]">
                    <span className="font-semibold text-[#1C1B18]">{msg.senderName}</span>
                    <span>• {msg.timestamp}</span>
                  </div>

                  <div className={`max-w-md p-4 rounded-2xl text-xs leading-relaxed shadow-xs ${
                    isGuest
                      ? 'bg-white text-[#1C1B18] border border-[#EBE6DD] rounded-tl-none'
                      : isAI
                      ? 'bg-[#0F3D5E] text-white rounded-tr-none border border-[#0C324E]'
                      : 'bg-[#D96B43] text-white rounded-tr-none'
                  }`}>
                    {/* Badge header for Chatbot or Staff */}
                    {isAI && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-[#E8A838] mb-1 pb-1 border-b border-white/20">
                        <Bot className="w-3.5 h-3.5" /> Vayca Chatbot ({Math.round((msg.confidenceScore || 0.95)*100)}% confidence)
                      </div>
                    )}
                    {isStaff && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-white/90 mb-1 pb-1 border-b border-white/20">
                        <UserCheck className="w-3.5 h-3.5" /> Staff Manual Response
                      </div>
                    )}

                    <p>{msg.text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Send Input Box */}
          <form onSubmit={handleSend} className="p-4 border-t border-[#EBE6DD] bg-white flex items-center gap-3">
            <input
              type="text"
              placeholder={conversation.aiMode ? "Send a manual message (chatbot simulator remains active unless paused)..." : "Type staff message..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2.5 px-4 text-xs text-[#1C1B18] focus:outline-none focus:border-[#0F3D5E]"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#0F3D5E] hover:bg-[#0C324E] text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-[#E8A838]" />
              Send
            </button>
          </form>

        </div>

        {/* Property & Stay Quick Knowledge Card (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-[#EBE6DD] p-5 shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm text-[#1C1B18] border-b border-[#EBE6DD] pb-3">
              Stay and Property Information
            </h3>

            <div>
              <span className="text-[#78716C] block font-semibold text-[10px] uppercase">Property Unit</span>
              <span className="font-bold text-[#0F3D5E] text-xs">{conversation.propertyName}</span>
            </div>

            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EBE6DD] space-y-2">
              <div className="flex items-center gap-2 text-[#0F3D5E] font-bold">
                <Wifi className="w-4 h-4" /> Guest WiFi Info
              </div>
              <div className="font-mono text-[11px] text-[#1C1B18]">SSID: VillaYasmine_5G_Guests</div>
              <div className="font-mono text-[11px] text-[#1C1B18]">Pass: HammametBeach2026!</div>
            </div>

            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EBE6DD] space-y-2">
              <div className="flex items-center gap-2 text-[#D96B43] font-bold">
                <Key className="w-4 h-4" /> Door Code
              </div>
              <div className="font-mono text-xs font-bold text-[#1C1B18]">4829#</div>
            </div>

            <div className="pt-2 border-t border-[#EBE6DD] space-y-1">
              <span className="text-[#78716C] block font-semibold text-[10px] uppercase">House Rules Quick Ref</span>
              <p className="text-[#3B3735] text-[11px]">
                Quiet hours 22:00. Pool cleaning Mon/Thu morning.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
