import { AlertTriangle, ArrowLeft, Bot, Send, UserCheck } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import type { ApiConversation, ApiMessage } from '../api/messaging';

interface ConversationThreadPageProps {
  conversation: ApiConversation | undefined;
  messages: ApiMessage[];
  loading: boolean;
  error: string | null;
  sending: boolean;
  propertyName: string | undefined;
  onBackToInbox: () => void;
  onRetry: () => void;
  onToggleHandlingMode: (mode: ApiConversation['handling_mode']) => void;
  onSendMessage: (content: string) => void;
}

export function ConversationThreadPage({ conversation, messages, loading, error, sending, propertyName, onBackToInbox, onRetry, onToggleHandlingMode, onSendMessage }: ConversationThreadPageProps) {
  const [content, setContent] = useState('');
  if (!conversation) return <div className="p-4 md:p-8"><button type="button" onClick={onBackToInbox} className="text-sm font-bold text-[#0F3D5E]">Back to messages</button><p className="mt-4 text-sm text-[#78716C]">Choose a conversation first.</p></div>;
  const manual = conversation.handling_mode === 'manual';
  const submit = (event: FormEvent) => { event.preventDefault(); if (content.trim() && !sending) { onSendMessage(content.trim()); setContent(''); } };
  return <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-8">
    <header className="flex flex-col justify-between gap-4 rounded-2xl border border-[#EBE6DD] bg-white p-5 shadow-sm md:flex-row md:items-center">
      <div className="flex items-center gap-3"><button type="button" aria-label="Back to messages" onClick={onBackToInbox} className="rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] p-2 text-[#0F3D5E]"><ArrowLeft className="h-4 w-4" /></button><div><h1 className="text-xl font-bold text-[#1C1B18]">{conversation.guest_contact_identifier}</h1><p className="text-xs text-[#78716C]">{propertyName ?? 'Property unavailable'}</p></div></div>
      <button type="button" disabled={sending || conversation.status === 'closed'} onClick={() => onToggleHandlingMode(manual ? 'automatic' : 'manual')} className={`rounded-xl px-4 py-2.5 text-xs font-bold text-white ${manual ? 'bg-[#D96B43]' : 'bg-emerald-600'} disabled:opacity-50`}>
        {manual ? <span className="inline-flex items-center gap-2"><UserCheck className="h-4 w-4" /> Manual mode — return to automatic</span> : <span className="inline-flex items-center gap-2"><Bot className="h-4 w-4" /> Automatic mode — take over</span>}
      </button>
    </header>
    {conversation.escalation_reason && <section role="status" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><p className="font-bold">Staff attention required</p><p className="mt-1">Escalated: {formatEscalationReason(conversation.escalation_reason)}</p></div></section>}
    {loading && <p className="rounded-2xl border border-[#EBE6DD] bg-white p-5 text-sm text-[#78716C]">Loading message history...</p>}
    {!loading && error && <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900"><p>{error}</p><button type="button" onClick={onRetry} className="mt-3 font-bold underline">Try again</button></section>}
    {!loading && !error && <section className="space-y-3 rounded-2xl border border-[#EBE6DD] bg-white p-5 shadow-sm">{messages.length === 0 ? <p className="py-8 text-center text-sm text-[#78716C]">No messages have been recorded yet.</p> : messages.map((message) => <article key={message.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.direction === 'outbound' ? 'ml-auto bg-[#0F3D5E] text-white' : 'bg-[#FAF8F5] text-[#1C1B18]'}`}><p>{message.content}</p><p className={`mt-2 text-[11px] ${message.direction === 'outbound' ? 'text-[#DCEDF5]' : 'text-[#78716C]'}`}>{message.sender_type} · {formatTime(message.created_at)} · {message.delivery_status}</p></article>)}</section>}
    <form onSubmit={submit} className="flex gap-2 rounded-2xl border border-[#EBE6DD] bg-white p-3 shadow-sm"><input value={content} disabled={sending || conversation.status === 'closed'} onChange={(event) => setContent(event.target.value)} placeholder={conversation.status === 'closed' ? 'This conversation is closed' : 'Write a manual reply...'} className="min-w-0 flex-1 rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] px-3 py-2 text-sm focus:border-[#0F3D5E] focus:outline-none disabled:opacity-60" /><button type="submit" disabled={!content.trim() || sending || conversation.status === 'closed'} className="inline-flex items-center gap-2 rounded-xl bg-[#D96B43] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><Send className="h-4 w-4" />{sending ? 'Sending' : 'Send'}</button></form>
  </div>;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatEscalationReason(reason: string): string {
  const labels: Record<string, string> = {
    cancellation: 'Cancellation request',
    complaint: 'Complaint',
    conflict: 'Conflict',
    emergency: 'Emergency',
    payment_or_refund: 'Payment or refund',
    uncertain: 'Uncertain request',
  };
  return labels[reason] ?? reason.replaceAll('_', ' ');
}
