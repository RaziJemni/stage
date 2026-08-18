import { Bot, MessageSquare, Search, UserCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { ApiConversation } from '../api/messaging';

export type ConversationFilter = 'all' | 'unread' | 'automatic' | 'manual';

interface InboxPageProps {
  conversations: ApiConversation[];
  loading: boolean;
  error: string | null;
  propertyNames: Record<string, string>;
  onRetry: () => void;
  onSelectConversation: (conversationId: string) => void;
  filter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
}

export function InboxPage({
  conversations,
  loading,
  error,
  propertyNames,
  onRetry,
  onSelectConversation,
  filter,
  onFilterChange,
}: InboxPageProps) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => conversations.filter((conversation) => {
    const searchable = `${conversation.guest_contact_identifier} ${propertyNames[conversation.property_id] ?? ''}`;
    return searchable.toLowerCase().includes(search.toLowerCase());
  }), [conversations, propertyNames, search]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="border-b border-[#EBE6DD] pb-6">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800">
          <Bot className="h-3.5 w-3.5" /> Local message simulator available; production delivery is not connected
        </span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#1C1B18]">Guest Messages</h1>
        <p className="mt-1 text-sm text-[#78716C]">Conversation records and manual replies are saved to your company workspace.</p>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-[#EBE6DD] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] p-1" aria-label="Conversation filters">
          {(['all', 'unread', 'automatic', 'manual'] as const).map((value) => (
            <button key={value} type="button" onClick={() => onFilterChange(value)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${filter === value ? 'bg-white text-[#0F3D5E] shadow-sm' : 'text-[#78716C]'}`}>
              {value === 'all' ? `All (${conversations.length})` : value === 'automatic' ? 'Chatbot handled' : value === 'manual' ? 'Staff attention' : 'Unread'}
            </button>
          ))}
        </div>
        <label className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#78716C]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search guest or property" className="w-full rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] py-2 pl-9 pr-3 text-sm focus:border-[#0F3D5E] focus:outline-none" />
        </label>
      </section>

      {loading && <StateCard text="Loading conversations..." />}
      {!loading && error && <StateCard text={error} retry={onRetry} error />}
      {!loading && !error && filtered.length === 0 && <StateCard text="No conversations match this view. Signed local simulator messages will appear here; production WhatsApp is not configured." />}
      {!loading && !error && filtered.length > 0 && (
        <section className="divide-y divide-[#EBE6DD] overflow-hidden rounded-2xl border border-[#EBE6DD] bg-white shadow-sm">
          {filtered.map((conversation) => {
            const automatic = conversation.handling_mode === 'automatic';
            return <button key={conversation.id} type="button" onClick={() => onSelectConversation(conversation.id)} className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-[#FAF8F5]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#B6DAEA] bg-[#F0F6FA] font-bold text-[#0F3D5E]">
                {conversation.guest_contact_identifier.slice(-2)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-bold text-[#1C1B18]">{conversation.guest_contact_identifier}</h2>
                <p className="mt-1 truncate text-xs text-[#78716C]">{propertyNames[conversation.property_id] ?? 'Property not available in this view'}</p>
                <p className="mt-1 text-[11px] text-[#78716C]">{formatTime(conversation.last_message_at)}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#78716C]">Last source: {formatSender(conversation.last_message_sender_type)}</p>
              </div>
              {conversation.unread_message_count > 0 && <span className="rounded-full bg-[#D96B43] px-2 py-1 text-xs font-bold text-white">Unread {conversation.unread_message_count}</span>}
              <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold ${automatic ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
                {automatic ? <Bot className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                {automatic ? 'Automatic' : 'Manual'}
              </span>
            </button>;
          })}
        </section>
      )}
    </div>
  );
}

function StateCard({ text, retry, error = false }: { text: string; retry?: () => void; error?: boolean }) {
  return <section className={`rounded-2xl border p-6 text-sm ${error ? 'border-red-200 bg-red-50 text-red-900' : 'border-[#EBE6DD] bg-white text-[#78716C]'}`}>
    <div className="flex items-start gap-3"><MessageSquare className="mt-0.5 h-5 w-5" /><p>{text}</p></div>
    {retry && <button type="button" onClick={retry} className="mt-4 rounded-xl bg-[#0F3D5E] px-3 py-2 text-xs font-bold text-white">Try again</button>}
  </section>;
}

function formatTime(value: string | null): string {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'No messages yet';
}

function formatSender(value: ApiConversation['last_message_sender_type']): string {
  return value ? value[0].toUpperCase() + value.slice(1) : 'None';
}
