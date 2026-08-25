import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckSquare, MessageSquare, RefreshCw, Ticket, Users } from 'lucide-react';
import type { ActivePage } from '../components/Sidebar';
import { fetchBookingConflicts, fetchCalendarBookings, type BookingConflict, type CalendarBooking } from '../api/calendar';
import { fetchAllConversations, type ApiConversation } from '../api/messaging';
import { fetchAllTickets, type ApiTicket } from '../api/maintenance';
import type { Property } from '../data/mockData';

interface DashboardPageProps {
  properties: Property[];
  companyTimezone: string;
  onNavigate: (page: ActivePage) => void;
}

function dateKey(value: Date | string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const valueFor = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${valueFor('year')}-${valueFor('month')}-${valueFor('day')}`;
}

function labelTime(value: string | null, timezone: string): string {
  return value ? new Intl.DateTimeFormat(undefined, { timeZone: timezone, hour: 'numeric', minute: '2-digit' }).format(new Date(value)) : 'No message time';
}

export function DashboardPage({ properties, companyTimezone, onNavigate }: DashboardPageProps) {
  const [conflicts, setConflicts] = useState<BookingConflict[]>([]);
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partialError, setPartialError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null); setPartialError(null);
    const now = new Date();
    const rangeStart = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString();
    const rangeEnd = new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString();
    const results = await Promise.allSettled([
      fetchBookingConflicts(),
      fetchAllConversations({ handling_mode: 'manual' }),
      fetchAllTickets({ priority: 'urgent' }),
      fetchCalendarBookings({ rangeStart, rangeEnd }),
    ]);
    const [conflictResult, conversationResult, ticketResult, bookingResult] = results;
    const failed = results.filter((result) => result.status === 'rejected').length;
    if (failed === results.length) {
      setError('Dashboard data could not be loaded. Try again.');
    } else if (failed > 0) {
      setPartialError('Some dashboard data is unavailable. Displayed items are current for the sources that loaded.');
    }
    if (conflictResult.status === 'fulfilled') setConflicts(conflictResult.value.filter((item) => item.status === 'open' || item.status === 'acknowledged'));
    if (conversationResult.status === 'fulfilled') setConversations(conversationResult.value);
    if (ticketResult.status === 'fulfilled') setTickets(ticketResult.value.filter((item) => item.status !== 'resolved' && item.status !== 'cancelled'));
    if (bookingResult.status === 'fulfilled') setBookings(bookingResult.value);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const today = dateKey(new Date(), companyTimezone);
  const arrivals = useMemo(() => bookings.filter((booking) => booking.record_type === 'reservation' && booking.status !== 'cancelled' && dateKey(booking.check_in, companyTimezone) === today), [bookings, companyTimezone, today]);
  const departures = useMemo(() => bookings.filter((booking) => booking.record_type === 'reservation' && booking.status !== 'cancelled' && dateKey(booking.check_out, companyTimezone) === today), [bookings, companyTimezone, today]);
  const propertyById = useMemo(() => Object.fromEntries(properties.map((property) => [property.id, property.name])), [properties]);
  const attentionTotal = conflicts.length + conversations.length + tickets.length;

  return <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
    <header className="flex flex-col gap-4 border-b border-[#EBE6DD] pb-6 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-[#D96B43]">Today’s operations</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-[#1C1B18]">Portfolio Dashboard</h1><p className="mt-1 text-sm text-[#78716C]">Attention items and arrivals from your company’s persisted operational data.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0F3D5E] px-4 py-2.5 text-xs font-bold text-[#0F3D5E] disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button></header>
    {loading && <section role="status" className="rounded-2xl border border-[#EBE6DD] bg-white p-6 text-sm text-[#78716C]">Loading today’s operations…</section>}
    {error && <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">{error} <button type="button" onClick={() => void load()} className="font-bold underline">Try again</button></section>}
    {partialError && !error && <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{partialError} <button type="button" onClick={() => void load()} className="font-bold underline">Retry</button></section>}
    {!loading && !error && <><section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric icon={<AlertTriangle className="h-4 w-4" />} label="Attention items" value={attentionTotal} detail="Conflicts, staff attention, urgent work" /><Metric icon={<CalendarDays className="h-4 w-4" />} label="Arrivals today" value={arrivals.length} detail="Confirmed and tentative reservations" /><Metric icon={<Users className="h-4 w-4" />} label="Departures today" value={departures.length} detail="Confirmed and tentative reservations" /><Metric icon={<CheckSquare className="h-4 w-4" />} label="Active properties" value={properties.length} detail="Current company portfolio" /></section>
      {attentionTotal === 0 ? <section className="rounded-2xl border border-dashed border-[#DDD7CC] bg-white p-8 text-center"><CheckSquare className="mx-auto h-8 w-8 text-emerald-600" /><h2 className="mt-3 text-base font-bold text-[#1C1B18]">No attention items right now</h2><p className="mt-1 text-sm text-[#78716C]">There are no open booking conflicts, staff-attention conversations, or urgent active tickets.</p></section> : <section className="grid gap-4 lg:grid-cols-3"><AttentionCard title="Booking conflicts" count={conflicts.length} icon={<AlertTriangle className="h-4 w-4" />} empty="No booking conflicts need review." action="Open Calendar" onAction={() => onNavigate('calendar')}>{conflicts.slice(0, 3).map((conflict) => <li key={conflict.id}><strong>{propertyById[conflict.property_id] ?? 'Property unavailable'}</strong><span className="block text-[#78716C]">{conflict.status === 'acknowledged' ? 'Acknowledged — follow-up pending' : 'Needs review'}</span></li>)}</AttentionCard><AttentionCard title="Staff attention" count={conversations.length} icon={<MessageSquare className="h-4 w-4" />} empty="No conversations need staff attention." action="Open Messages" onAction={() => onNavigate('inbox')}>{conversations.slice(0, 3).map((conversation) => <li key={conversation.id}><strong>{propertyById[conversation.property_id] ?? 'Property unavailable'}</strong><span className="block text-[#78716C]">{conversation.escalation_reason ?? 'Manual handling'} · {labelTime(conversation.last_message_at, companyTimezone)}</span></li>)}</AttentionCard><AttentionCard title="Urgent maintenance" count={tickets.length} icon={<Ticket className="h-4 w-4" />} empty="No urgent active tickets." action="Open Maintenance" onAction={() => onNavigate('tickets')}>{tickets.slice(0, 3).map((ticket) => <li key={ticket.id}><strong>{ticket.title}</strong><span className="block text-[#78716C]">{propertyById[ticket.property_id] ?? 'Property unavailable'} · {ticket.status.replace('_', ' ')}</span></li>)}</AttentionCard></section>}
      <section className="grid gap-4 lg:grid-cols-2"><ScheduleCard title="Arrivals today" bookings={arrivals} propertyById={propertyById} timezone={companyTimezone} empty="No guest arrivals today." /><ScheduleCard title="Departures today" bookings={departures} propertyById={propertyById} timezone={companyTimezone} empty="No guest departures today." /></section>
    </>}
  </div>;
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) { return <article className="rounded-2xl border border-[#EBE6DD] bg-white p-5 shadow-[0_2px_8px_rgba(28,27,24,0.02)]"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-[#78716C]">{label}</span><span className="rounded-xl bg-[#F0F6FA] p-2 text-[#0F3D5E]">{icon}</span></div><p className="mt-3 text-3xl font-extrabold tracking-tight text-[#1C1B18]">{value}</p><p className="mt-1 text-xs text-[#78716C]">{detail}</p></article>; }
function AttentionCard({ title, count, icon, empty, action, onAction, children }: { title: string; count: number; icon: React.ReactNode; empty: string; action: string; onAction: () => void; children: React.ReactNode }) { return <article className="rounded-2xl border border-[#EBE6DD] bg-white p-5"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold text-[#1C1B18]">{icon}{title}</h2><span className="rounded-full bg-[#FDF4F0] px-2 py-1 text-xs font-bold text-[#C25730]">{count}</span></div>{count === 0 ? <p className="mt-4 text-sm text-[#78716C]">{empty}</p> : <ul className="mt-4 space-y-3 text-sm text-[#3B3735]">{children}</ul>}<button type="button" onClick={onAction} className="mt-5 text-xs font-bold text-[#0F3D5E] underline">{action}</button></article>; }
function ScheduleCard({ title, bookings, propertyById, timezone, empty }: { title: string; bookings: CalendarBooking[]; propertyById: Record<string, string>; timezone: string; empty: string }) { return <section className="rounded-2xl border border-[#EBE6DD] bg-white p-5"><h2 className="font-bold text-[#1C1B18]">{title}</h2>{bookings.length === 0 ? <p className="mt-4 text-sm text-[#78716C]">{empty}</p> : <ul className="mt-4 divide-y divide-[#EBE6DD]">{bookings.map((booking) => <li key={booking.id} className="py-3 first:pt-0"><p className="text-sm font-bold text-[#1C1B18]">{booking.guest_name ?? 'Guest details unavailable'}</p><p className="text-xs text-[#78716C]">{propertyById[booking.property_id] ?? 'Property unavailable'} · {new Intl.DateTimeFormat(undefined, { timeZone: timezone, hour: 'numeric', minute: '2-digit' }).format(new Date(booking.check_in))}</p></li>)}</ul>}</section>; }
