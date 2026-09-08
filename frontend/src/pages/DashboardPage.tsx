import { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  AlertTriangle, 
  CalendarDays, 
  CheckSquare, 
  MessageSquare, 
  RefreshCw, 
  Ticket, 
  Users, 
  ArrowUpRight,
  ShieldAlert,
  Clock
} from 'lucide-react';
import type { ActivePage } from '../components/Sidebar';
import { fetchBookingConflicts, fetchCalendarBookings, type BookingConflict, type CalendarBooking } from '../api/calendar';
import { fetchAllConversations, type ApiConversation } from '../api/messaging';
import { fetchAllTickets, type ApiTicket } from '../api/maintenance';
import type { Property } from '../data/mockData';
import { WorkstationHeader } from '../components/WorkstationHeader';
import { useI18n } from '../i18n/I18nContext';

interface DashboardPageProps {
  properties: Property[];
  companyTimezone: string;
  onNavigate: (page: ActivePage) => void;
}

function dateKey(value: Date | string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { 
    timeZone: timezone, 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).formatToParts(new Date(value));
  const valueFor = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${valueFor('year')}-${valueFor('month')}-${valueFor('day')}`;
}

function labelTime(value: string | null, timezone: string): string {
  return value 
    ? new Intl.DateTimeFormat(undefined, { timeZone: timezone, hour: 'numeric', minute: '2-digit' }).format(new Date(value)) 
    : 'No message time';
}

export function DashboardPage({ properties, companyTimezone, onNavigate }: DashboardPageProps) {
  const { t, locale } = useI18n();
  const [conflicts, setConflicts] = useState<BookingConflict[]>([]);
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partialError, setPartialError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); 
    setError(null); 
    setPartialError(null);
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
    if (conflictResult.status === 'fulfilled' && Array.isArray(conflictResult.value)) {
      setConflicts(conflictResult.value.filter((item) => item.status === 'open' || item.status === 'acknowledged'));
    }
    if (conversationResult.status === 'fulfilled' && Array.isArray(conversationResult.value)) {
      setConversations(conversationResult.value);
    }
    if (ticketResult.status === 'fulfilled' && Array.isArray(ticketResult.value)) {
      setTickets(ticketResult.value.filter((item) => item.status !== 'resolved' && item.status !== 'cancelled'));
    }
    if (bookingResult.status === 'fulfilled' && Array.isArray(bookingResult.value)) {
      setBookings(bookingResult.value);
    }
    setLoading(false);
  }, []);

  useEffect(() => { 
    void load(); 
  }, [load]);

  const safeConflicts = conflicts || [];
  const safeConversations = conversations || [];
  const safeTickets = tickets || [];
  const safeBookings = bookings || [];
  const safeProperties = properties || [];

  const today = dateKey(new Date(), companyTimezone);
  const arrivals = useMemo(() => 
    safeBookings.filter((booking) => 
      booking.record_type === 'reservation' && 
      booking.status !== 'cancelled' && 
      dateKey(booking.check_in, companyTimezone) === today
    ), 
    [safeBookings, companyTimezone, today]
  );
  const departures = useMemo(() => 
    safeBookings.filter((booking) => 
      booking.record_type === 'reservation' && 
      booking.status !== 'cancelled' && 
      dateKey(booking.check_out, companyTimezone) === today
    ), 
    [safeBookings, companyTimezone, today]
  );
  const propertyById = useMemo(() => 
    Object.fromEntries(safeProperties.map((property) => [property.id, property.name])), 
    [safeProperties]
  );
  const attentionTotal = safeConflicts.length + safeConversations.length + safeTickets.length;

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF8F5]">
      {/* Standardized 64px Workstation Header */}
      <WorkstationHeader
        section={t('nav.dashboard')}
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        actions={
          <div className="flex items-center gap-2.5">
            <button 
              type="button" 
              onClick={() => void load()} 
              disabled={loading} 
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#EBE6DD] bg-white px-3 py-1.5 text-xs font-semibold text-[#3B3735] hover:bg-[#FAF8F5] transition-colors disabled:opacity-60 shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('common.refresh')}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#D96B43] hover:bg-[#C25730] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all active:scale-[0.98]"
            >
              <span>{t('dashboard.new_booking')}</span>
            </button>
          </div>
        }
      />

      {/* Main Operational Body */}
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {loading && (
          <section role="status" className="rounded-xl border border-[#EBE6DD] bg-white p-6 text-sm text-[#78716C] shadow-sm flex items-center gap-3">
            <RefreshCw className="h-4 w-4 animate-spin text-[#0F3D5E]" />
            <span>{t('common.loading')}</span>
          </section>
        )}

        {error && (
          <section role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => void load()} className="font-bold underline text-rose-800 hover:text-rose-900">
              {t('common.retry')}
            </button>
          </section>
        )}

        {partialError && !error && (
          <section role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm flex items-center justify-between">
            <span>{partialError}</span>
            <button type="button" onClick={() => void load()} className="font-bold underline text-amber-800 hover:text-amber-900">
              {t('common.retry')}
            </button>
          </section>
        )}

        {!loading && !error && (
          <>
            {/* 4 Calm Operational KPI Tiles (No pastel circles or arbitrary graphs) */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric 
                icon={<ShieldAlert className="h-4 w-4" />} 
                label={t('dashboard.attention_items')} 
                value={attentionTotal} 
                detail={t('dashboard.attention_sub')} 
                isUrgent={attentionTotal > 0}
              />
              <Metric 
                icon={<CalendarDays className="h-4 w-4" />} 
                label={t('dashboard.arrivals_today')} 
                value={arrivals.length} 
                detail={t('dashboard.arrivals_sub')} 
              />
              <Metric 
                icon={<Users className="h-4 w-4" />} 
                label={t('dashboard.departures_today')} 
                value={departures.length} 
                detail={t('dashboard.departures_sub')} 
              />
              <Metric 
                icon={<CheckSquare className="h-4 w-4" />} 
                label={t('dashboard.active_properties')} 
                value={safeProperties.length} 
                detail={t('dashboard.active_properties_sub')} 
              />
            </section>

            {/* High Priority Triage Stream */}
            {attentionTotal === 0 ? (
              <section className="rounded-xl border border-dashed border-[#DDD7CC] bg-white p-8 text-center shadow-sm">
                <CheckSquare className="mx-auto h-8 w-8 text-emerald-600" />
                <h2 className="mt-3 text-base font-bold text-[#1C1B18]">{t('dashboard.no_attention')}</h2>
                <p className="mt-1 text-sm text-[#78716C]">{t('dashboard.no_attention_sub')}</p>
              </section>
            ) : (
              <section className="grid gap-4 lg:grid-cols-3">
                <AttentionCard 
                  title={locale === 'fr' ? 'Conflits de réservation' : 'Booking conflicts'} 
                  count={safeConflicts.length} 
                  icon={<AlertTriangle className="h-4 w-4 text-rose-600" />} 
                  empty={locale === 'fr' ? 'Aucun conflit à examiner.' : 'No booking conflicts need review.'} 
                  action={locale === 'fr' ? 'Ouvrir le Calendrier' : 'Open Calendar'} 
                  onAction={() => onNavigate('calendar')}
                  theme="rose"
                >
                  {safeConflicts.slice(0, 3).map((conflict) => (
                    <li key={conflict.id} className="p-3 bg-[#FEF2F2] rounded-lg border border-[#FECACA]/60 text-xs">
                      <strong className="text-[#1C1B18] font-bold block">{propertyById[conflict.property_id] ?? 'Property unavailable'}</strong>
                      <span className="text-rose-700 font-medium mt-0.5 block">
                        {conflict.status === 'acknowledged' ? (locale === 'fr' ? 'Accusé de réception' : 'Acknowledged') : (locale === 'fr' ? '⚠️ Conflit de surréservation à examiner' : '⚠️ Double-Booking Overlap Needs Review')}
                      </span>
                    </li>
                  ))}
                </AttentionCard>

                <AttentionCard 
                  title={locale === 'fr' ? 'Attention requise' : 'Staff attention'} 
                  count={safeConversations.length} 
                  icon={<MessageSquare className="h-4 w-4 text-[#D96B43]" />} 
                  empty={locale === 'fr' ? 'Aucune conversation ne requiert d\'intervention.' : 'No conversations need staff attention.'} 
                  action={locale === 'fr' ? 'Ouvrir la Messagerie' : 'Open Messages'} 
                  onAction={() => onNavigate('inbox')}
                  theme="terracotta"
                >
                  {safeConversations.slice(0, 3).map((conversation) => (
                    <li key={conversation.id} className="p-3 bg-[#FDF4F0] rounded-lg border border-[#FBE6DC] text-xs">
                      <strong className="text-[#1C1B18] font-bold block">{propertyById[conversation.property_id] ?? 'Property unavailable'}</strong>
                      <span className="text-[#D96B43] font-medium mt-0.5 block">
                        {conversation.escalation_reason ?? 'Manual handling'} · {labelTime(conversation.last_message_at, companyTimezone)}
                      </span>
                    </li>
                  ))}
                </AttentionCard>

                <AttentionCard 
                  title={locale === 'fr' ? 'Maintenance urgente' : 'Urgent maintenance'} 
                  count={safeTickets.length} 
                  icon={<Ticket className="h-4 w-4 text-[#0F3D5E]" />} 
                  empty={locale === 'fr' ? 'Aucun ticket urgent actif.' : 'No urgent active tickets.'} 
                  action={locale === 'fr' ? 'Ouvrir la Maintenance' : 'Open Maintenance'} 
                  onAction={() => onNavigate('tickets')}
                  theme="azure"
                >
                  {safeTickets.slice(0, 3).map((ticket) => (
                    <li key={ticket.id} className="p-3 bg-[#F0F6FA] rounded-lg border border-[#B6DAEA]/60 text-xs">
                      <strong className="text-[#1C1B18] font-bold block">{ticket.title}</strong>
                      <span className="text-[#0F3D5E] font-medium mt-0.5 block">
                        {propertyById[ticket.property_id] ?? 'Property unavailable'} · {ticket.status.replace('_', ' ')}
                      </span>
                    </li>
                  ))}
                </AttentionCard>
              </section>
            )}

            {/* Today's Operational Guest Movements */}
            <section className="grid gap-4 lg:grid-cols-2">
              <ScheduleCard 
                title={t('dashboard.arrivals_today')} 
                bookings={arrivals} 
                propertyById={propertyById} 
                timezone={companyTimezone} 
                empty={t('dashboard.no_arrivals')} 
                isArrival={true}
              />
              <ScheduleCard 
                title={t('dashboard.departures_today')} 
                bookings={departures} 
                propertyById={propertyById} 
                timezone={companyTimezone} 
                empty={t('dashboard.no_departures')} 
                isArrival={false}
              />
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ 
  icon, 
  label, 
  value, 
  detail,
  isUrgent = false 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  detail: string;
  isUrgent?: boolean;
}) { 
  return (
    <article className="rounded-xl border border-[#EBE6DD] bg-white p-4 shadow-sm transition-all hover:border-[#DDD7CC]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">{label}</span>
        <span className={`rounded-lg p-1.5 ${isUrgent ? 'bg-[#FDF4F0] text-[#D96B43]' : 'bg-[#F0F6FA] text-[#0F3D5E]'}`}>
          {icon}
        </span>
      </div>
      <p className={`mt-2 text-2xl font-extrabold tracking-tight ${isUrgent ? 'text-[#D96B43]' : 'text-[#1C1B18]'}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-[#78716C] truncate">{detail}</p>
    </article>
  ); 
}

function AttentionCard({ 
  title, 
  count, 
  icon, 
  empty, 
  action, 
  onAction, 
  theme = 'azure',
  children 
}: { 
  title: string; 
  count: number; 
  icon: React.ReactNode; 
  empty: string; 
  action: string; 
  onAction: () => void; 
  theme?: 'rose' | 'terracotta' | 'azure';
  children: React.ReactNode;
}) { 
  const badgeClasses = {
    rose: 'bg-[#FEF2F2] text-rose-700 border border-[#FECACA]',
    terracotta: 'bg-[#FDF4F0] text-[#D96B43] border border-[#FBE6DC]',
    azure: 'bg-[#F0F6FA] text-[#0F3D5E] border border-[#B6DAEA]',
  };

  return (
    <article className="rounded-xl border border-[#EBE6DD] bg-white p-4 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[#EBE6DD]">
          <h2 className="flex items-center gap-2 font-bold text-sm text-[#1C1B18]">
            {icon}
            <span>{title}</span>
          </h2>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badgeClasses[theme]}`}>
            {count}
          </span>
        </div>
        {count === 0 ? (
          <p className="mt-4 text-xs text-[#78716C] italic">{empty}</p>
        ) : (
          <ul className="mt-3 space-y-2">{children}</ul>
        )}
      </div>
      <button 
        type="button" 
        onClick={onAction} 
        className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0F3D5E] hover:underline"
      >
        <span>{action}</span>
        <ArrowUpRight className="h-3 w-3" />
      </button>
    </article>
  ); 
}

function ScheduleCard({ 
  title, 
  bookings, 
  propertyById, 
  timezone, 
  empty,
  isArrival = true
}: { 
  title: string; 
  bookings: CalendarBooking[]; 
  propertyById: Record<string, string>; 
  timezone: string; 
  empty: string; 
  isArrival?: boolean;
}) { 
  return (
    <section className="rounded-xl border border-[#EBE6DD] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-[#EBE6DD]">
        <h2 className="font-bold text-sm text-[#1C1B18] flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#78716C]" />
          <span>{title}</span>
        </h2>
        <span className="text-xs font-semibold text-[#78716C]">
          {bookings.length} {bookings.length === 1 ? 'Guest' : 'Guests'}
        </span>
      </div>
      {bookings.length === 0 ? (
        <p className="mt-4 text-xs text-[#78716C] italic">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-[#EBE6DD]">
          {bookings.map((booking) => (
            <li key={booking.id} className="py-2.5 first:pt-0 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-[#1C1B18] text-sm">{booking.guest_name ?? 'Guest details unavailable'}</p>
                <p className="text-[11px] text-[#78716C] mt-0.5">
                  {propertyById[booking.property_id] ?? 'Property unavailable'} · {new Intl.DateTimeFormat(undefined, { timeZone: timezone, hour: 'numeric', minute: '2-digit' }).format(new Date(isArrival ? booking.check_in : booking.check_out))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F0F6FA] text-[#0F3D5E] border border-[#B6DAEA]">
                  {booking.source_type ?? 'Direct'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize border ${
                  booking.status === 'confirmed'
                    ? 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]'
                    : booking.status === 'tentative'
                    ? 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
                    : 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]'
                }`}>
                  {booking.status ?? 'Confirmed'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  ); 
}
