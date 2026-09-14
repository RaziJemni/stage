import { apiRequest } from '../auth/api';

export type BookingSource = 'airbnb' | 'booking_com' | 'vrbo' | 'expedia' | 'direct' | 'manual' | 'other';
export type BookingStatus = 'tentative' | 'confirmed' | 'cancelled';
export type BookingRecordType = 'reservation' | 'blocked_period';
export type ConflictStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';
export type FeedHealthStatus =
  | 'pending'
  | 'running'
  | 'healthy'
  | 'stale'
  | 'partial'
  | 'failed'
  | 'inactive';

export interface ApiPage<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  pages: number;
}

export type PaymentStatus = 'unpaid' | 'deposit_received' | 'paid_in_full';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'check' | 'other';

export interface CalendarBooking {
  id: string;
  property_id: string;
  source_type: BookingSource;
  record_type: BookingRecordType;
  status: BookingStatus;
  check_in: string;
  check_out: string;
  guest_name: string | null;
  payment_status?: PaymentStatus | null;
}

export interface CalendarBookingDetail extends CalendarBooking {
  guest_contact: string | null;
  notes: string | null;
  payment_status: PaymentStatus | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  payment_method: PaymentMethod | string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarFeedHealth {
  id: string;
  property_id: string;
  channel_type: 'airbnb' | 'booking_com' | 'vrbo' | 'expedia' | 'direct' | 'other';
  is_active: boolean;
  health_status: FeedHealthStatus;
  last_successful_sync_at: string | null;
  last_sync_at: string | null;
  last_sync_status: 'running' | 'succeeded' | 'partial' | 'failed' | null;
  last_error_summary: string | null;
}

export type CalendarFeedChannelType = 'airbnb' | 'booking_com' | 'vrbo' | 'expedia' | 'other';

export interface CalendarFeedConfigPayload {
  channel_type: CalendarFeedChannelType;
  calendar_url: string;
  external_listing_id?: string | null;
}

export interface CalendarFeedConfigResponse {
  id: string;
  property_id: string;
  channel_type: CalendarFeedChannelType;
  external_listing_id: string | null;
  calendar_url: string | null;
  is_active: boolean;
  last_successful_sync_at: string | null;
  last_error_summary: string | null;
}

export interface CalendarSyncQueuedResponse {
  channel_id: string;
  status: 'queued';
}

export interface ConflictBooking {
  id: string;
  property_id: string;
  channel_id: string | null;
  external_event_id: string | null;
  source_type: BookingSource;
  record_type: BookingRecordType;
  status: BookingStatus;
  check_in: string;
  check_out: string;
  guest_name: string | null;
}

export interface BookingConflict {
  id: string;
  property_id: string;
  status: ConflictStatus;
  detected_at: string;
  acknowledged_at: string | null;
  acknowledged_by_user_id: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  resolved_by_user_id: string | null;
  bookings: ConflictBooking[];
}

export interface ManualBookingPayload {
  property_id: string;
  source_type: 'direct' | 'manual';
  record_type: BookingRecordType;
  status: 'tentative' | 'confirmed';
  check_in: string;
  check_out: string;
  guest_name?: string | null;
  guest_contact?: string | null;
  notes?: string | null;
  payment_status?: PaymentStatus | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  payment_method?: PaymentMethod | string | null;
}

export interface ManualBookingUpdatePayload {
  status?: 'tentative' | 'confirmed';
  check_in?: string;
  check_out?: string;
  guest_name?: string | null;
  guest_contact?: string | null;
  notes?: string | null;
  payment_status?: PaymentStatus | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  payment_method?: PaymentMethod | string | null;
}

async function fetchAllPages<T>(buildPath: (page: number) => string): Promise<T[]> {
  const first = await apiRequest<ApiPage<T>>(buildPath(1));
  if (first.pages <= 1) return first.items;

  const remaining = await Promise.all(
    Array.from({ length: first.pages - 1 }, (_, index) =>
      apiRequest<ApiPage<T>>(buildPath(index + 2))
    )
  );
  return [first.items, ...remaining.map((page) => page.items)].flat();
}

function pageQuery(page: number): string {
  return `page=${page}&page_size=100`;
}

export async function fetchCalendarBookings(params: {
  rangeStart: string;
  rangeEnd: string;
  propertyId?: string;
  sourceType?: BookingSource;
  status?: BookingStatus;
}): Promise<CalendarBooking[]> {
  const buildPath = (page: number) => {
    const query = new URLSearchParams({
      range_start: params.rangeStart,
      range_end: params.rangeEnd,
      page: String(page),
      page_size: '100',
    });
    if (params.propertyId) query.set('property_id', params.propertyId);
    if (params.sourceType) query.set('source_type', params.sourceType);
    if (params.status) query.set('status', params.status);
    return `/api/v1/bookings?${query.toString()}`;
  };
  return fetchAllPages<CalendarBooking>(buildPath);
}

export async function fetchBooking(bookingId: string): Promise<CalendarBookingDetail> {
  return apiRequest<CalendarBookingDetail>(`/api/v1/bookings/${bookingId}`);
}

export async function fetchCalendarFeeds(propertyId?: string): Promise<CalendarFeedHealth[]> {
  return fetchAllPages<CalendarFeedHealth>((page) => {
    const query = new URLSearchParams(pageQuery(page));
    if (propertyId) query.set('property_id', propertyId);
    return `/api/v1/calendar-feeds?${query.toString()}`;
  });
}

export async function configureCalendarFeed(
  propertyId: string,
  payload: CalendarFeedConfigPayload
): Promise<CalendarFeedConfigResponse> {
  return apiRequest<CalendarFeedConfigResponse>(`/api/v1/properties/${propertyId}/calendar-feeds`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function requestCalendarFeedSync(channelId: string): Promise<CalendarSyncQueuedResponse> {
  return apiRequest<CalendarSyncQueuedResponse>(`/api/v1/calendar-feeds/${channelId}/sync`, {
    method: 'POST',
  });
}

export async function fetchBookingConflicts(params: {
  propertyId?: string;
  status?: ConflictStatus;
} = {}): Promise<BookingConflict[]> {
  return fetchAllPages<BookingConflict>((page) => {
    const query = new URLSearchParams(pageQuery(page));
    if (params.propertyId) query.set('property_id', params.propertyId);
    if (params.status) query.set('status', params.status);
    return `/api/v1/booking-conflicts?${query.toString()}`;
  });
}

export async function fetchBookingConflict(conflictId: string): Promise<BookingConflict> {
  return apiRequest<BookingConflict>(`/api/v1/booking-conflicts/${conflictId}`);
}

export async function acknowledgeBookingConflict(
  conflictId: string,
  resolutionNote?: string
): Promise<BookingConflict> {
  return apiRequest<BookingConflict>(`/api/v1/booking-conflicts/${conflictId}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({ resolution_note: resolutionNote?.trim() || null }),
  });
}

export async function createManualBooking(payload: ManualBookingPayload): Promise<CalendarBookingDetail> {
  return apiRequest<CalendarBookingDetail>('/api/v1/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateManualBooking(
  bookingId: string,
  payload: ManualBookingUpdatePayload
): Promise<CalendarBookingDetail> {
  return apiRequest<CalendarBookingDetail>(`/api/v1/bookings/${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function cancelManualBooking(bookingId: string): Promise<CalendarBookingDetail> {
  return apiRequest<CalendarBookingDetail>(`/api/v1/bookings/${bookingId}/cancel`, {
    method: 'POST',
  });
}

export interface AvailabilityCheckResponse {
  is_available: boolean;
  conflicting_bookings: ConflictBooking[];
}

export async function checkPropertyAvailability(
  propertyId: string,
  params: { checkIn: string; checkOut: string; excludeBookingId?: string }
): Promise<AvailabilityCheckResponse> {
  const query = new URLSearchParams({
    check_in: params.checkIn,
    check_out: params.checkOut,
  });
  if (params.excludeBookingId) {
    query.set('exclude_booking_id', params.excludeBookingId);
  }
  return apiRequest<AvailabilityCheckResponse>(
    `/api/v1/properties/${propertyId}/availability?${query.toString()}`
  );
}

export interface BookingReceiptData {
  invoice_number: string;
  issue_date: string;
  booking_id: string;
  property_id: string;
  company_name: string;
  property_name: string;
  property_address: string | null;
  property_city: string | null;
  guest_name: string | null;
  guest_contact: string | null;
  check_in: string;
  check_out: string;
  check_in_time: string | null;
  check_out_time: string | null;
  nights: number;
  currency: string;
  unit_nightly_rate: number | string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  outstanding_balance: number | string | null;
  payment_status: PaymentStatus | null;
  payment_method: string | null;
  status: BookingStatus;
  source_type: BookingSource;
  notes: string | null;
}

export async function fetchBookingReceiptData(bookingId: string): Promise<BookingReceiptData> {
  return apiRequest<BookingReceiptData>(`/api/v1/bookings/${bookingId}/receipt/data`);
}

export function getBookingReceiptHtmlUrl(bookingId: string, lang = 'fr'): string {
  return `/api/v1/bookings/${bookingId}/receipt?lang=${encodeURIComponent(lang)}`;
}
