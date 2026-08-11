import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Edit3,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  X,
} from 'lucide-react';
import { ApiError } from '../auth/api';
import { fetchProperties, type ApiProperty, type ApiPropertyPage } from '../api/properties';
import {
  acknowledgeBookingConflict,
  cancelManualBooking,
  createManualBooking,
  fetchBooking,
  fetchBookingConflict,
  fetchBookingConflicts,
  fetchCalendarBookings,
  fetchCalendarFeeds,
  updateManualBooking,
  type BookingConflict,
  type BookingRecordType,
  type BookingSource,
  type BookingStatus,
  type CalendarBooking,
  type CalendarBookingDetail,
  type CalendarFeedHealth,
  type ConflictBooking,
  type FeedHealthStatus,
  type ManualBookingPayload,
} from '../api/calendar';

interface CalendarProperty {
  id: string;
  name: string;
  city: string | null;
  timezone: string;
  status: 'active' | 'archived';
}

interface CalendarPageProps {
  companyTimezone: string;
  onSelectProperty?: (propertyId: string) => void;
  onConflictStateChange?: (hasActiveConflicts: boolean) => void;
}

type StatusFilter = 'active' | BookingStatus;

const VIEW_DAYS = 14;
const PAGE_SIZE = 100;

const sourceLabels: Record<BookingSource, string> = {
  airbnb: 'Airbnb',
  booking_com: 'Booking.com',
  direct: 'Direct',
  manual: 'Manual',
  other: 'Other',
};

const statusLabels: Record<BookingStatus, string> = {
  tentative: 'Tentative',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

const feedHealthLabels: Record<FeedHealthStatus, string> = {
  pending: 'Awaiting first refresh',
  running: 'Refreshing',
  healthy: 'Healthy',
  stale: 'Stale',
  partial: 'Partial refresh',
  failed: 'Refresh failed',
  inactive: 'Inactive',
};

const sourceBadgeClasses: Record<BookingSource, string> = {
  airbnb: 'bg-[#FF5A5F] text-white',
  booking_com: 'bg-[#003580] text-white',
  direct: 'bg-[#0F3D5E] text-white',
  manual: 'bg-[#78716C] text-white',
  other: 'bg-[#57534E] text-white',
};

const feedHealthClasses: Record<FeedHealthStatus, string> = {
  pending: 'border-slate-200 bg-slate-50 text-slate-700',
  running: 'border-azure-200 bg-azure-50 text-azure-700',
  healthy: 'border-green-200 bg-green-50 text-green-700',
  stale: 'border-amber-200 bg-amber-50 text-amber-800',
  partial: 'border-amber-200 bg-amber-50 text-amber-800',
  failed: 'border-rose-200 bg-rose-50 text-rose-800',
  inactive: 'border-slate-200 bg-slate-50 text-slate-600',
};

function dateKeyParts(date: Date, timezone: string): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
}

function dateKeyAtTimezone(date: Date, timezone: string): string {
  const parts = dateKeyParts(date, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateKeyToUtc(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function addDays(dateKey: string, days: number): string {
  const date = dateKeyToUtc(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayInTimezone(timezone: string): string {
  return dateKeyAtTimezone(new Date(), timezone);
}

function formatDateLabel(dateKey: string, options: Intl.DateTimeFormatOptions): string {
  // A date key is already a local calendar day. Format the UTC anchor directly
  // so zones east of UTC cannot roll the label into the following day.
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(dateKeyToUtc(dateKey));
}

function formatDateTime(value: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function isoDateKey(value: string, timezone: string): string {
  return dateKeyAtTimezone(new Date(value), timezone);
}

function bookingOccupiesDay(booking: CalendarBooking | ConflictBooking, day: string, timezone: string): boolean {
  const start = isoDateKey(booking.check_in, timezone);
  const end = isoDateKey(booking.check_out, timezone);
  if (start === end) return day === start;
  return day >= start && day < end;
}

function toCalendarProperty(property: ApiProperty): CalendarProperty {
  return {
    id: property.id,
    name: property.name,
    city: property.city ?? null,
    timezone: property.timezone,
    status: property.status,
  };
}

async function fetchAllProperties(): Promise<CalendarProperty[]> {
  const first = await fetchProperties({ page: 1, page_size: PAGE_SIZE });
  const remaining = first.pages > 1
    ? await Promise.all(
        Array.from({ length: first.pages - 1 }, (_, index) =>
          fetchProperties({ page: index + 2, page_size: PAGE_SIZE })
        )
      )
    : [];
  return [first, ...remaining]
    .flatMap((page: ApiPropertyPage) => page.items)
    .filter((property) => property.status === 'active')
    .map(toCalendarProperty);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : error instanceof Error ? error.message : fallback;
}

function healthForProperty(feeds: CalendarFeedHealth[], propertyId: string): CalendarFeedHealth[] {
  return feeds.filter((feed) => feed.property_id === propertyId);
}

function propertyHealthLabel(feeds: CalendarFeedHealth[], propertyId: string): string {
  const propertyFeeds = healthForProperty(feeds, propertyId);
  if (propertyFeeds.length === 0) return 'No calendar feed configured';
  if (propertyFeeds.some((feed) => feed.health_status === 'failed')) return 'Feed refresh failed';
  if (propertyFeeds.some((feed) => feed.health_status === 'partial')) return 'Partial feed refresh';
  if (propertyFeeds.some((feed) => feed.health_status === 'stale')) return 'Feed is stale';
  if (propertyFeeds.some((feed) => feed.health_status === 'running')) return 'Feed refreshing';
  if (propertyFeeds.some((feed) => feed.health_status === 'pending')) return 'Awaiting first feed refresh';
  return 'Feeds healthy';
}

function toFormLocal(value: string | null, timezone: string): string {
  if (!value) return '';
  const parts = dateKeyParts(new Date(value), timezone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function fromFormLocal(value: string, timezone: string): string {
  const [date, time] = value.split('T');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = targetAsUtc;

  // Iteratively solve the wall-clock time in the company IANA timezone without
  // introducing a date-time dependency for this small form.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = dateKeyParts(new Date(candidate), timezone);
    const actualAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute)
    );
    candidate += targetAsUtc - actualAsUtc;
  }
  return new Date(candidate).toISOString();
}

interface BookingEditorProps {
  propertyOptions: CalendarProperty[];
  timezone: string;
  booking: CalendarBookingDetail | null;
  defaultPropertyId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

function BookingEditor({ propertyOptions, timezone, booking, defaultPropertyId, onClose, onSaved }: BookingEditorProps) {
  const isEditing = Boolean(booking);
  const initialRecordType: BookingRecordType = booking?.record_type ?? 'reservation';
  const [propertyId, setPropertyId] = useState(booking?.property_id ?? defaultPropertyId);
  const [recordType, setRecordType] = useState<BookingRecordType>(initialRecordType);
  const [status, setStatus] = useState<'tentative' | 'confirmed'>(
    booking?.status === 'tentative' ? 'tentative' : 'confirmed'
  );
  const [guestName, setGuestName] = useState(booking?.guest_name ?? '');
  const [notes, setNotes] = useState(booking?.notes ?? '');
  const defaultToday = todayInTimezone(timezone);
  const [checkIn, setCheckIn] = useState(
    booking ? toFormLocal(booking.check_in, timezone) : `${defaultToday}T14:00`
  );
  const [checkOut, setCheckOut] = useState(
    booking ? toFormLocal(booking.check_out, timezone) : `${addDays(defaultToday, 1)}T10:00`
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const trimmedGuestName = guestName.trim();
    if (!isEditing && !propertyId) {
      setError('Choose a property for this record.');
      return;
    }
    if (recordType === 'reservation' && !trimmedGuestName) {
      setError('Guest name is required for a reservation.');
      return;
    }
    if (!checkIn || !checkOut) {
      setError('Check-in and check-out are required.');
      return;
    }

    const checkInIso = fromFormLocal(checkIn, timezone);
    const checkOutIso = fromFormLocal(checkOut, timezone);
    if (new Date(checkOutIso) <= new Date(checkInIso)) {
      setError('Check-out must be after check-in.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && booking) {
        await updateManualBooking(booking.id, {
          status,
          check_in: checkInIso,
          check_out: checkOutIso,
          guest_name: recordType === 'reservation' ? trimmedGuestName : null,
          notes: notes.trim() || null,
        });
      } else {
        const payload: ManualBookingPayload = {
          property_id: propertyId,
          source_type: recordType === 'blocked_period' ? 'manual' : 'direct',
          record_type: recordType,
          status: recordType === 'blocked_period' ? 'confirmed' : status,
          check_in: checkInIso,
          check_out: checkOutIso,
          guest_name: recordType === 'reservation' ? trimmedGuestName : null,
          notes: notes.trim() || null,
        };
        await createManualBooking(payload);
      }
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(errorMessage(saveError, 'The booking could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1C1B18]/35 p-0 md:items-center md:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="booking-editor-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-[#EBE6DD] bg-white p-5 shadow-[0_8px_30px_rgba(28,27,24,0.16)] md:rounded-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#D96B43]">Manual calendar entry</p>
            <h2 id="booking-editor-title" className="mt-1 text-xl font-bold text-[#1C1B18]">{isEditing ? 'Edit booking' : 'New direct booking'}</h2>
            <p className="mt-1 text-xs text-[#78716C]">Times are entered in {timezone}.</p>
          </div>
          <button type="button" aria-label="Close booking editor" onClick={onClose} className="rounded-lg p-2 text-[#78716C] hover:bg-[#FAF8F5] hover:text-[#1C1B18]"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {!isEditing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-[#3B3735]">Property
                <select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className="mt-1 w-full rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] px-3 py-2 text-sm font-normal text-[#1C1B18]" required>
                  <option value="">Choose a property</option>
                  {propertyOptions.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-[#3B3735]">Record type
                <select value={recordType} onChange={(event) => setRecordType(event.target.value as BookingRecordType)} className="mt-1 w-full rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] px-3 py-2 text-sm font-normal text-[#1C1B18]">
                  <option value="reservation">Direct reservation</option>
                  <option value="blocked_period">Blocked period</option>
                </select>
              </label>
            </div>
          )}

          {isEditing && <div className="rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] px-3 py-2 text-xs text-[#3B3735]">{recordType === 'blocked_period' ? 'Blocked period' : 'Direct reservation'} · {propertyOptions.find((property) => property.id === propertyId)?.name ?? 'Property'}</div>}

          {recordType === 'reservation' && (
            <label className="block text-xs font-semibold text-[#3B3735]">Guest name
              <input value={guestName} onChange={(event) => setGuestName(event.target.value)} maxLength={160} className="mt-1 w-full rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] px-3 py-2 text-sm font-normal text-[#1C1B18]" required />
            </label>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-[#3B3735]">Check-in
              <input type="datetime-local" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} className="mt-1 w-full rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] px-3 py-2 text-sm font-normal text-[#1C1B18]" required />
            </label>
            <label className="text-xs font-semibold text-[#3B3735]">Check-out
              <input type="datetime-local" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} className="mt-1 w-full rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] px-3 py-2 text-sm font-normal text-[#1C1B18]" required />
            </label>
          </div>

          <label className="block text-xs font-semibold text-[#3B3735]">Status
            <select value={status} onChange={(event) => setStatus(event.target.value as 'tentative' | 'confirmed')} className="mt-1 w-full rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] px-3 py-2 text-sm font-normal text-[#1C1B18]" disabled={recordType === 'blocked_period'}>
              <option value="confirmed">Confirmed</option>
              <option value="tentative">Tentative</option>
            </select>
          </label>

          <label className="block text-xs font-semibold text-[#3B3735]">Internal note <span className="font-normal text-[#78716C]">(optional)</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} rows={3} className="mt-1 w-full rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] px-3 py-2 text-sm font-normal text-[#1C1B18]" />
          </label>

          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{error}</div>}
          <div className="flex justify-end gap-2 border-t border-[#EBE6DD] pt-4">
            <button type="button" onClick={onClose} className="rounded-xl border border-[#EBE6DD] px-4 py-2 text-xs font-semibold text-[#3B3735]">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#0F3D5E] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-[#E8A838]" />}
              {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create entry'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export const CalendarPage: React.FC<CalendarPageProps> = ({ companyTimezone, onSelectProperty, onConflictStateChange }) => {
  const [rangeStart, setRangeStart] = useState(() => todayInTimezone(companyTimezone));
  const rangeEnd = addDays(rangeStart, VIEW_DAYS);
  const [properties, setProperties] = useState<CalendarProperty[]>([]);
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [feeds, setFeeds] = useState<CalendarFeedHealth[]>([]);
  const [conflicts, setConflicts] = useState<BookingConflict[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [partialErrors, setPartialErrors] = useState<string[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedSource, setSelectedSource] = useState<BookingSource | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('active');
  const [selectedBooking, setSelectedBooking] = useState<CalendarBookingDetail | null>(null);
  const [selectedConflict, setSelectedConflict] = useState<BookingConflict | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acknowledgementNote, setAcknowledgementNote] = useState('');
  const [acknowledging, setAcknowledging] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingBooking, setEditingBooking] = useState<CalendarBookingDetail | null>(null);

  const days = useMemo(() => Array.from({ length: VIEW_DAYS }, (_, index) => addDays(rangeStart, index)), [rangeStart]);
  const propertyById = useMemo(() => new Map(properties.map((property) => [property.id, property])), [properties]);
  const bookingsByProperty = useMemo(() => {
    const grouped = new Map<string, CalendarBooking[]>();
    bookings.forEach((booking) => grouped.set(booking.property_id, [...(grouped.get(booking.property_id) ?? []), booking]));
    return grouped;
  }, [bookings]);

  const refreshCalendar = useCallback(async () => {
    setLoadingCalendar(true);
    setPartialErrors([]);
    const rangeParams = {
      rangeStart: fromFormLocal(`${rangeStart}T00:00`, companyTimezone),
      rangeEnd: fromFormLocal(`${rangeEnd}T00:00`, companyTimezone),
      propertyId: selectedPropertyId || undefined,
      sourceType: selectedSource || undefined,
      status: selectedStatus === 'active' ? undefined : selectedStatus,
    };
    const results = await Promise.allSettled([
      fetchCalendarBookings(rangeParams),
      fetchCalendarFeeds(selectedPropertyId || undefined),
      fetchBookingConflicts({ propertyId: selectedPropertyId || undefined }),
    ]);
    const [bookingResult, feedResult, conflictResult] = results;
    const errors: string[] = [];
    if (bookingResult.status === 'fulfilled') setBookings(bookingResult.value);
    else {
      setBookings([]);
      errors.push('Bookings could not be loaded.');
    }
    if (feedResult.status === 'fulfilled') setFeeds(feedResult.value);
    else {
      setFeeds([]);
      errors.push('Feed health could not be loaded.');
    }
    if (conflictResult.status === 'fulfilled') {
      setConflicts(conflictResult.value);
      onConflictStateChange?.(conflictResult.value.some((conflict) => conflict.status === 'open' || conflict.status === 'acknowledged'));
    } else {
      setConflicts([]);
      onConflictStateChange?.(false);
      errors.push('Conflict alerts could not be loaded.');
    }
    setPartialErrors(errors);
    setLoadingCalendar(false);
  }, [companyTimezone, onConflictStateChange, rangeEnd, rangeStart, selectedPropertyId, selectedSource, selectedStatus]);

  const loadProperties = useCallback(async () => {
    setLoadingProperties(true);
    setPropertiesError(null);
    try {
      const loaded = await fetchAllProperties();
      setProperties(loaded);
      setSelectedPropertyId((current) => current && loaded.some((property) => property.id === current) ? current : '');
    } catch (error) {
      setPropertiesError(errorMessage(error, 'Properties could not be loaded.'));
    } finally {
      setLoadingProperties(false);
    }
  }, []);

  useEffect(() => { void loadProperties(); }, [loadProperties]);
  useEffect(() => { void refreshCalendar(); }, [refreshCalendar]);

  const openBooking = async (bookingId: string) => {
    setSelectedConflict(null);
    setSelectedBooking(null);
    setDetailError(null);
    setActionError(null);
    setDetailLoading(true);
    try {
      setSelectedBooking(await fetchBooking(bookingId));
    } catch (error) {
      setDetailError(errorMessage(error, 'Booking details could not be loaded.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const openConflict = async (conflictId: string) => {
    setSelectedBooking(null);
    setSelectedConflict(null);
    setDetailError(null);
    setActionError(null);
    setAcknowledgementNote('');
    setDetailLoading(true);
    try {
      setSelectedConflict(await fetchBookingConflict(conflictId));
    } catch (error) {
      setDetailError(errorMessage(error, 'Conflict details could not be loaded.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const acknowledgeSelectedConflict = async () => {
    if (!selectedConflict) return;
    setAcknowledging(true);
    setActionError(null);
    try {
      const updated = await acknowledgeBookingConflict(selectedConflict.id, acknowledgementNote);
      setSelectedConflict(updated);
      await refreshCalendar();
    } catch (error) {
      setActionError(errorMessage(error, 'The conflict could not be acknowledged. Refresh and try again.'));
    } finally {
      setAcknowledging(false);
    }
  };

  const cancelSelectedBooking = async () => {
    if (!selectedBooking || !window.confirm('Cancel this manual booking? Its dates will become available after the calendar refreshes.')) return;
    setActionError(null);
    try {
      await cancelManualBooking(selectedBooking.id);
      setSelectedBooking(null);
      await refreshCalendar();
    } catch (error) {
      setActionError(errorMessage(error, 'The booking could not be cancelled.'));
    }
  };

  const visibleProperties = selectedPropertyId ? properties.filter((property) => property.id === selectedPropertyId) : properties;
  const activeConflictCount = conflicts.filter((conflict) => conflict.status === 'open' || conflict.status === 'acknowledged').length;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 md:p-8">
      <div className="flex flex-col gap-4 border-b border-[#EBE6DD] pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#B6DAEA] bg-[#F0F6FA] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#0F3D5E]"><CalendarDays className="h-3.5 w-3.5" /> Live portfolio calendar</span>
            {activeConflictCount > 0 && <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700"><AlertTriangle className="h-3.5 w-3.5" /> {activeConflictCount} active conflict{activeConflictCount === 1 ? '' : 's'}</span>}
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#1C1B18]">Multi-property booking calendar</h1>
          <p className="mt-1 max-w-3xl text-sm text-[#78716C]">Persistent reservations and blocked periods across your company properties. Feed health and conflict state come from the calendar APIs.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-[#EBE6DD] bg-white p-1 shadow-sm">
            <button type="button" aria-label="Previous 14 days" onClick={() => setRangeStart(addDays(rangeStart, -VIEW_DAYS))} className="rounded-lg p-2 text-[#3B3735] hover:bg-[#FAF8F5]"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => setRangeStart(todayInTimezone(companyTimezone))} className="px-3 text-xs font-bold text-[#1C1B18]">{formatDateLabel(rangeStart, { month: 'short', day: 'numeric' })} – {formatDateLabel(addDays(rangeEnd, -1), { month: 'short', day: 'numeric', year: 'numeric' })}</button>
            <button type="button" aria-label="Next 14 days" onClick={() => setRangeStart(addDays(rangeStart, VIEW_DAYS))} className="rounded-lg p-2 text-[#3B3735] hover:bg-[#FAF8F5]"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <button type="button" onClick={() => { setEditingBooking(null); setShowEditor(true); }} disabled={properties.length === 0} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3D5E] px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#0C324E] disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4 text-[#E8A838]" /> New direct booking</button>
        </div>
      </div>

      {propertiesError && <div role="alert" className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between"><span>{propertiesError}</span><button type="button" onClick={() => void loadProperties()} className="inline-flex items-center gap-1.5 self-start rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 sm:self-auto"><RefreshCw className="h-3.5 w-3.5" /> Retry</button></div>}
      {partialErrors.length > 0 && <div role="alert" className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"><span>{partialErrors.join(' ')}</span><button type="button" onClick={() => void refreshCalendar()} className="inline-flex items-center gap-1.5 self-start rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-800 sm:self-auto"><RefreshCw className="h-3.5 w-3.5" /> Retry calendar data</button></div>}

      <div className="flex flex-col gap-3 rounded-2xl border border-[#EBE6DD] bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold text-[#78716C]">Property
            <select value={selectedPropertyId} onChange={(event) => setSelectedPropertyId(event.target.value)} className="mt-1 block min-w-[180px] rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold text-[#1C1B18]">
              <option value="">All properties</option>
              {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#78716C]">Source
            <select value={selectedSource} onChange={(event) => setSelectedSource(event.target.value as BookingSource | '')} className="mt-1 block min-w-[160px] rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold text-[#1C1B18]">
              <option value="">All sources</option>
              {(['airbnb', 'booking_com', 'direct', 'manual', 'other'] as BookingSource[]).map((source) => <option key={source} value={source}>{sourceLabels[source]}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#78716C]">Status
            <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as StatusFilter)} className="mt-1 block min-w-[160px] rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold text-[#1C1B18]">
              <option value="active">Active records</option>
              <option value="tentative">Tentative</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#78716C]" aria-label="Booking source legend">
          {(['airbnb', 'booking_com', 'direct', 'manual'] as BookingSource[]).map((source) => <span key={source} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${sourceBadgeClasses[source].split(' ')[0]}`} /> {sourceLabels[source]}</span>)}
          <span className="inline-flex items-center gap-1.5 font-semibold text-rose-700"><span className="h-2.5 w-2.5 rounded-full bg-rose-600" /> Conflict</span>
        </div>
      </div>

      {loadingProperties || loadingCalendar ? (
        <div role="status" className="space-y-3 rounded-2xl border border-[#EBE6DD] bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-sm font-semibold text-[#3B3735]"><LoaderCircle className="h-4 w-4 animate-spin text-[#0F3D5E]" /> Loading live calendar data…</div><div className="h-12 animate-pulse rounded-xl bg-[#FAF8F5]" /><div className="h-48 animate-pulse rounded-xl bg-[#FAF8F5]" /></div>
      ) : properties.length === 0 ? (
        <div data-testid="calendar-empty-properties" className="rounded-2xl border border-dashed border-[#DDD7CC] bg-white px-6 py-14 text-center shadow-sm"><Building2 className="mx-auto h-8 w-8 text-[#B5AFA4]" /><h2 className="mt-3 text-base font-bold text-[#1C1B18]">No active properties</h2><p className="mx-auto mt-1 max-w-md text-sm text-[#78716C]">Add an active property before using the portfolio calendar.</p></div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Calendar feed health">
            {visibleProperties.map((property) => {
              const propertyFeeds = healthForProperty(feeds, property.id);
              return <div key={property.id} className="rounded-xl border border-[#EBE6DD] bg-white px-3 py-2.5 shadow-sm"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-bold text-[#1C1B18]">{property.name}</span><Clock3 className="h-3.5 w-3.5 shrink-0 text-[#B5AFA4]" /></div><p className="mt-1 text-[11px] text-[#78716C]">{propertyHealthLabel(feeds, property.id)}</p>{propertyFeeds.length === 0 ? <p className="mt-2 text-[10px] text-[#78716C]">No configured calendar feed.</p> : <div className="mt-2 space-y-1.5">{propertyFeeds.map((feed) => <div key={feed.id} className={`rounded-md border px-1.5 py-1 text-[10px] ${feedHealthClasses[feed.health_status]}`}><div className="flex items-center justify-between gap-2"><span className="font-bold">{sourceLabels[feed.channel_type === 'booking_com' ? 'booking_com' : feed.channel_type]}</span><span className="font-bold">{feedHealthLabels[feed.health_status]}</span></div>{feed.last_error_summary ? <p className="mt-0.5 truncate" title={feed.last_error_summary}>{feed.last_error_summary}</p> : feed.last_successful_sync_at ? <p className="mt-0.5">Last success {formatDateTime(feed.last_successful_sync_at, companyTimezone)}</p> : <p className="mt-0.5">No successful refresh yet.</p>}</div>)}</div>}</div>;
            })}
          </div>

          {bookings.length === 0 ? <div data-testid="calendar-empty-entries" className="rounded-2xl border border-dashed border-[#DDD7CC] bg-white px-6 py-12 text-center shadow-sm"><CalendarDays className="mx-auto h-8 w-8 text-[#B5AFA4]" /><h2 className="mt-3 text-base font-bold text-[#1C1B18]">No entries in this date range</h2><p className="mt-1 text-sm text-[#78716C]">Try another 14-day window or create a direct booking.</p></div> : <div className="overflow-hidden rounded-2xl border border-[#EBE6DD] bg-white shadow-sm"><div className="overflow-x-auto" aria-label="Scrollable multi-property calendar"><table className="w-full min-w-[1050px] border-collapse text-left"><thead><tr className="border-b border-[#EBE6DD] bg-[#FAF8F5]"><th className="sticky left-0 z-10 w-56 border-r border-[#EBE6DD] bg-[#FAF8F5] px-4 py-3 text-xs font-bold text-[#1C1B18]">Property</th>{days.map((day) => <th key={day} className="min-w-[56px] border-r border-[#EBE6DD] px-1 py-2 text-center text-xs font-semibold text-[#78716C]"><div className="text-[10px] uppercase">{formatDateLabel(day, { weekday: 'short' })}</div><div className="mt-0.5 text-xs text-[#1C1B18]">{formatDateLabel(day, { day: 'numeric' })}</div></th>)}</tr></thead><tbody className="divide-y divide-[#EBE6DD]">{visibleProperties.map((property) => { const propertyBookings = bookingsByProperty.get(property.id) ?? []; return <tr key={property.id} className="hover:bg-[#FAF8F5]/40"><td className="sticky left-0 z-10 border-r border-[#EBE6DD] bg-white px-4 py-3 align-top shadow-[2px_0_5px_rgba(0,0,0,0.02)]"><button type="button" onClick={() => onSelectProperty?.(property.id)} className="flex w-full items-start gap-2 text-left"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F0F6FA] text-[#0F3D5E]"><Building2 className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-xs font-bold text-[#1C1B18]">{property.name}</span><span className="mt-0.5 block truncate text-[10px] text-[#78716C]">{property.city ?? 'Location not configured'}</span><span className="mt-1 block truncate text-[10px] text-[#78716C]">{propertyHealthLabel(feeds, property.id)}</span></span></button></td>{days.map((day) => { const dayBookings = propertyBookings.filter((booking) => bookingOccupiesDay(booking, day, companyTimezone)); const conflict = dayBookings.length > 1 ? conflicts.find((candidate) => candidate.bookings.some((booking) => booking.id === dayBookings[0].id) && candidate.bookings.some((booking) => booking.id === dayBookings[1].id)) : undefined; const primary = dayBookings[0]; return <td key={day} className="h-16 border-r border-[#EBE6DD] p-1 align-middle text-center">{conflict ? <button type="button" onClick={() => void openConflict(conflict.id)} className="flex h-full w-full flex-col items-center justify-center rounded-lg bg-rose-600 p-1 text-[10px] font-bold text-white shadow-sm hover:bg-rose-700" title="Open booking conflict"><CircleAlert className="h-3.5 w-3.5" /><span>Conflict</span><span className="font-normal">{conflict.status === 'acknowledged' ? 'Acknowledged' : 'Needs review'}</span></button> : primary ? <button type="button" onClick={() => void openBooking(primary.id)} className={`flex h-full w-full flex-col items-start justify-center overflow-hidden rounded-lg p-1.5 text-left text-[10px] font-semibold shadow-sm hover:brightness-95 ${sourceBadgeClasses[primary.source_type]}`}><span className="w-full truncate font-bold">{primary.record_type === 'blocked_period' ? 'Blocked period' : primary.guest_name ?? 'Unnamed reservation'}</span><span className="mt-0.5 w-full truncate text-[9px] opacity-90">{sourceLabels[primary.source_type]} · {statusLabels[primary.status]}</span></button> : <span className="block h-full rounded-lg border border-dashed border-transparent hover:border-[#DDD7CC]" />}</td>; })}</tr>; })}</tbody></table></div></div>}
        </>
      )}

      {(detailLoading || selectedBooking || selectedConflict) && <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#1C1B18]/25 p-0 md:items-center md:p-6"><section role="dialog" aria-modal="true" aria-labelledby="calendar-detail-title" className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-[#EBE6DD] bg-white p-5 shadow-[0_8px_30px_rgba(28,27,24,0.16)] md:rounded-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-wider text-[#D96B43]">Calendar detail</p><h2 id="calendar-detail-title" className="mt-1 text-xl font-bold text-[#1C1B18]">{selectedConflict ? 'Booking conflict' : 'Booking details'}</h2></div><button type="button" aria-label="Close calendar detail" onClick={() => { setSelectedBooking(null); setSelectedConflict(null); }} className="rounded-lg p-2 text-[#78716C] hover:bg-[#FAF8F5]"><X className="h-4 w-4" /></button></div>{detailLoading ? <div role="status" className="flex items-center gap-2 py-10 text-sm text-[#78716C]"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading details…</div> : detailError ? <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{detailError}</div> : selectedConflict ? <ConflictDetail conflict={selectedConflict} propertyById={propertyById} timezone={companyTimezone} acknowledgementNote={acknowledgementNote} setAcknowledgementNote={setAcknowledgementNote} acknowledging={acknowledging} actionError={actionError} onAcknowledge={() => void acknowledgeSelectedConflict()} /> : selectedBooking ? <BookingDetail booking={selectedBooking} propertyById={propertyById} timezone={companyTimezone} actionError={actionError} onEdit={() => { setEditingBooking(selectedBooking); setSelectedBooking(null); setShowEditor(true); }} onCancel={() => void cancelSelectedBooking()} /> : null}</section></div>}

      {showEditor && <BookingEditor propertyOptions={properties} timezone={companyTimezone} booking={editingBooking} defaultPropertyId={selectedPropertyId || properties[0]?.id || ''} onClose={() => { setShowEditor(false); setEditingBooking(null); setSelectedBooking(null); }} onSaved={refreshCalendar} />}
    </div>
  );
};

interface ConflictDetailProps {
  conflict: BookingConflict;
  propertyById: Map<string, CalendarProperty>;
  timezone: string;
  acknowledgementNote: string;
  setAcknowledgementNote: (value: string) => void;
  acknowledging: boolean;
  actionError: string | null;
  onAcknowledge: () => void;
}

function ConflictDetail({ conflict, propertyById, timezone, acknowledgementNote, setAcknowledgementNote, acknowledging, actionError, onAcknowledge }: ConflictDetailProps) {
  return <div className="mt-5 space-y-4"><div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-rose-900"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" /><div><p className="text-sm font-bold">{conflict.status === 'acknowledged' ? 'Acknowledged conflict' : conflict.status === 'resolved' ? 'Resolved conflict' : 'Review required'}</p><p className="mt-1 text-xs">Detected {formatDateTime(conflict.detected_at, timezone)} · {propertyById.get(conflict.property_id)?.name ?? 'Property unavailable'}</p></div></div><div className="grid gap-3 sm:grid-cols-2">{conflict.bookings.map((booking) => <div key={booking.id} className="rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] p-3"><div className="flex items-center justify-between gap-2"><span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${sourceBadgeClasses[booking.source_type]}`}>{sourceLabels[booking.source_type]}</span><span className="text-[10px] font-semibold capitalize text-[#78716C]">{statusLabels[booking.status]}</span></div><p className="mt-2 text-sm font-bold text-[#1C1B18]">{booking.record_type === 'blocked_period' ? 'Blocked period' : booking.guest_name ?? 'Unnamed reservation'}</p><p className="mt-1 text-xs text-[#78716C]">{formatDateTime(booking.check_in, timezone)} – {formatDateTime(booking.check_out, timezone)}</p></div>)}</div>{conflict.resolution_note && <div className="rounded-xl border border-[#EBE6DD] bg-white px-3 py-2 text-xs text-[#3B3735]"><span className="font-bold">Acknowledgement note:</span> {conflict.resolution_note}</div>}{conflict.status === 'open' && <div className="space-y-2 border-t border-[#EBE6DD] pt-4"><label className="block text-xs font-semibold text-[#3B3735]">Acknowledgement note <span className="font-normal text-[#78716C]">(optional)</span><textarea value={acknowledgementNote} onChange={(event) => setAcknowledgementNote(event.target.value)} maxLength={4000} rows={3} className="mt-1 w-full rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] px-3 py-2 text-sm font-normal text-[#1C1B18]" /></label><button type="button" onClick={onAcknowledge} disabled={acknowledging} className="inline-flex items-center gap-2 rounded-xl bg-[#0F3D5E] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">{acknowledging ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-[#E8A838]" />} {acknowledging ? 'Acknowledging…' : 'Acknowledge conflict'}</button></div>}{actionError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{actionError}</div>}</div>;
}

interface BookingDetailProps {
  booking: CalendarBookingDetail;
  propertyById: Map<string, CalendarProperty>;
  timezone: string;
  actionError: string | null;
  onEdit: () => void;
  onCancel: () => void;
}

function BookingDetail({ booking, propertyById, timezone, actionError, onEdit, onCancel }: BookingDetailProps) {
  const isManual = booking.source_type === 'direct' || booking.source_type === 'manual';
  return <div className="mt-5 space-y-4"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-md px-2 py-1 text-[11px] font-bold ${sourceBadgeClasses[booking.source_type]}`}>{sourceLabels[booking.source_type]}</span><span className="rounded-md border border-[#EBE6DD] bg-[#FAF8F5] px-2 py-1 text-[11px] font-bold text-[#3B3735]">{booking.record_type === 'blocked_period' ? 'Blocked period' : 'Reservation'}</span><span className="rounded-md border border-[#EBE6DD] bg-white px-2 py-1 text-[11px] font-bold capitalize text-[#3B3735]">{statusLabels[booking.status]}</span></div><div><h3 className="text-lg font-bold text-[#1C1B18]">{booking.record_type === 'blocked_period' ? 'Blocked period' : booking.guest_name ?? 'Unnamed reservation'}</h3><p className="mt-1 text-xs text-[#78716C]">{propertyById.get(booking.property_id)?.name ?? 'Property unavailable'} · {formatDateTime(booking.check_in, timezone)} – {formatDateTime(booking.check_out, timezone)}</p></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] p-3"><p className="text-[11px] font-semibold uppercase tracking-wider text-[#78716C]">Booking ID</p><p className="mt-1 break-all text-xs font-semibold text-[#1C1B18]">{booking.id}</p></div><div className="rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] p-3"><p className="text-[11px] font-semibold uppercase tracking-wider text-[#78716C]">Last updated</p><p className="mt-1 text-xs font-semibold text-[#1C1B18]">{formatDateTime(booking.updated_at, timezone)}</p></div></div>{booking.notes && <div className="rounded-xl border border-[#EBE6DD] bg-white px-3 py-2 text-xs text-[#3B3735]"><span className="font-bold">Internal note:</span> {booking.notes}</div>}{booking.status === 'cancelled' && <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"><Ban className="h-4 w-4" /> This record is cancelled and no longer blocks availability.</div>}{!isManual && <div className="flex items-center gap-2 rounded-xl border border-[#B6DAEA] bg-[#F0F6FA] px-3 py-2 text-xs text-[#0F3D5E]"><CircleAlert className="h-4 w-4" /> Imported records are read-only in Vayca. Manage changes in the source channel.</div>}{isManual && booking.status !== 'cancelled' && <div className="flex flex-wrap justify-end gap-2 border-t border-[#EBE6DD] pt-4"><button type="button" onClick={onCancel} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"><Ban className="h-3.5 w-3.5" /> Cancel booking</button><button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3D5E] px-3 py-2 text-xs font-bold text-white"><Edit3 className="h-3.5 w-3.5 text-[#E8A838]" /> Edit entry</button></div>}{actionError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{actionError}</div>}</div>;
}

export default CalendarPage;
