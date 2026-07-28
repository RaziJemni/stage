import React, { useState } from 'react';
import type { Conversation } from '../data/mockData';
import { 
  Bot, 
  UserCheck, 
  AlertTriangle, 
  Search, 
  ArrowRight
} from 'lucide-react';

interface InboxPageProps {
  conversations: Conversation[];
  onSelectConversation: (convId: string) => void;
}

export const InboxPage: React.FC<InboxPageProps> = ({
  conversations,
  onSelectConversation
}) => {
  const [filterTab, setFilterTab] = useState<'All' | 'AI_Handled' | 'Human_Action' | 'Unread'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = conversations.filter((c) => {
    if (filterTab === 'AI_Handled' && c.status !== 'ai_handled') return false;
    if (filterTab === 'Human_Action' && c.status !== 'human_action_required') return false;
    if (filterTab === 'Unread' && !c.unread) return false;

    if (searchTerm) {
      const matchGuest = c.guestName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchProp = c.propertyName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchMsg = c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
      return matchGuest || matchProp || matchMsg;
    }
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EBE6DD] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-emerald-600" /> Automatic Replies Prototype
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#1C1B18] mt-1.5 tracking-tight">
            Guest Messages
          </h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            Unified inbox across Airbnb, Booking.com, VRBO & Direct WhatsApp guest chats.
          </p>
        </div>

        {/* Status Indicators Summary Pill */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 bg-white rounded-xl border border-[#EBE6DD] shadow-xs flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="font-semibold text-[#1C1B18]">AI Automated: 12</span>
          </div>
          <div className="px-3 py-1.5 bg-white rounded-xl border border-[#EBE6DD] shadow-xs flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="font-semibold text-[#1C1B18]">Requires Staff: 2</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-[#EBE6DD] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1 rounded-xl border border-[#EBE6DD]">
          <button
            onClick={() => setFilterTab('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterTab === 'All'
                ? 'bg-white text-[#0F3D5E] shadow-sm border border-[#EBE6DD] font-bold'
                : 'text-[#78716C] hover:text-[#1C1B18]'
            }`}
          >
            All Messages ({conversations.length})
          </button>
          <button
            onClick={() => setFilterTab('AI_Handled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filterTab === 'AI_Handled'
                ? 'bg-emerald-600 text-white shadow-sm font-bold'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <Bot className="w-3.5 h-3.5" /> AI Replied
          </button>
          <button
            onClick={() => setFilterTab('Human_Action')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filterTab === 'Human_Action'
                ? 'bg-amber-500 text-white shadow-sm font-bold'
                : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Needs Human Staff
          </button>
          <button
            onClick={() => setFilterTab('Unread')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterTab === 'Unread'
                ? 'bg-[#0F3D5E] text-white shadow-sm font-bold'
                : 'text-[#78716C] hover:text-[#1C1B18]'
            }`}
          >
            Unread
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-3" />
          <input 
            type="text"
            placeholder="Search guest or message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 pl-10 pr-4 text-xs text-[#1C1B18] focus:outline-none focus:border-[#0F3D5E]"
          />
        </div>

      </div>

      {/* Conversations List */}
      <div className="bg-white rounded-2xl border border-[#EBE6DD] shadow-sm overflow-hidden divide-y divide-[#EBE6DD]">
        {filtered.map((conv) => {
          const isAIHandled = conv.status === 'ai_handled';
          const isHumanNeeded = conv.status === 'human_action_required';

          return (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#FAF8F5] transition-all cursor-pointer group ${
                conv.unread ? 'bg-[#F0F6FA]/40' : ''
              }`}
            >
              {/* Left Column: Guest Info & Message */}
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-[#0F3D5E]/10 text-[#0F3D5E] font-bold text-sm flex items-center justify-center border border-[#EBE6DD]">
                    {conv.guestName.charAt(0)}
                  </div>
                  {conv.unread && (
                    <span className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-white absolute -top-0.5 -right-0.5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-[#1C1B18] group-hover:text-[#0F3D5E] transition-colors">
                      {conv.guestName}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                      conv.channel === 'Airbnb' ? 'bg-[#FF5A5F]' :
                      conv.channel === 'Booking.com' ? 'bg-[#003580]' :
                      'bg-[#0F3D5E]'
                    }`}>
                      {conv.channel}
                    </span>
                    <span className="text-xs text-[#78716C]">• {conv.propertyName}</span>
                  </div>

                  <p className="text-xs text-[#3B3735] mt-1.5 line-clamp-1 group-hover:text-[#1C1B18]">
                    "{conv.lastMessage}"
                  </p>

                  <div className="text-[10px] text-[#78716C] mt-1">
                    {conv.lastMessageTime}
                  </div>
                </div>
              </div>

              {/* Right Column: AI vs Human Tag & Action */}
              <div className="flex items-center gap-3 shrink-0">
                {isAIHandled ? (
                  <div className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-emerald-600" />
                    <span>Chatbot Replied</span>
                  </div>
                ) : isHumanNeeded ? (
                  <div className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Staff Attention Needed</span>
                  </div>
                ) : (
                  <div className="px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>Staff Took Over</span>
                  </div>
                )}

                <button className="p-2 rounded-xl bg-white border border-[#EBE6DD] text-[#0F3D5E] group-hover:bg-[#0F3D5E] group-hover:text-white transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
