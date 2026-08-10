import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarPage } from './CalendarPage';
import { fetchProperties } from '../api/properties';
import {
  acknowledgeBookingConflict,
  createManualBooking,
  fetchBooking,
  fetchBookingConflict,
  fetchBookingConflicts,
  fetchCalendarBookings,
  fetchCalendarFeeds,
} from '../api/calendar';

vi.mock('../api/properties', () => ({
  fetchProperties: vi.fn(),
}));

vi.mock('../api/calendar', () => ({
  acknowledgeBookingConflict: vi.fn(),
  cancelManualBooking: vi.fn(),
  createManualBooking: vi.fn(),
  fetchBooking: vi.fn(),
  fetchBookingConflict: vi.fn(),
  fetchBookingConflicts: vi.fn(),
  fetchCalendarBookings: vi.fn(),
  fetchCalendarFeeds: vi.fn(),
  updateManualBooking: vi.fn(),
}));

const property = {
  id: 'property-1',
  company_id: 'company-1',
  name: 'Villa Yasmine',
  address_line1: null,
  address_line2: null,
  city: 'Hammamet',
  postal_code: null,
  country_code: 'TN',
  timezone: 'Africa/Tunis',
  max_guests: 8,
  check_in_time: null,
  check_out_time: null,
  wifi_network: null,
  wifi_password: null,
  parking_info: null,
  amenities: null,
  house_rules: null,
  emergency_contact: null,
  directions: null,
  external_booking_url: null,
  status: 'active' as const,
  archived_at: null,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
};

const booking = {
  id: 'booking-1',
  property_id: 'property-1',
  channel_id: null,
  external_event_id: null,
  source_type: 'direct' as const,
  record_type: 'reservation' as const,
  status: 'confirmed' as const,
  check_in: '2026-08-10T14:00:00Z',
  check_out: '2026-08-12T10:00:00Z',
  guest_name: 'Sami Guest',
};

const bookingDetail = {
  ...booking,
  guest_contact: '+21620000000',
  notes: 'Direct reservation note',
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
};

function configureApi() {
  vi.mocked(fetchProperties).mockResolvedValue({ items: [property], page: 1, page_size: 100, total: 1, pages: 1 });
  vi.mocked(fetchCalendarBookings).mockResolvedValue([booking]);
  vi.mocked(fetchCalendarFeeds).mockResolvedValue([]);
  vi.mocked(fetchBookingConflicts).mockResolvedValue([]);
  vi.mocked(fetchBooking).mockResolvedValue(bookingDetail);
  vi.mocked(fetchBookingConflict).mockResolvedValue({
    id: 'conflict-1',
    property_id: 'property-1',
    status: 'open',
    detected_at: '2026-08-01T00:00:00Z',
    acknowledged_at: null,
    acknowledged_by_user_id: null,
    resolution_note: null,
    resolved_at: null,
    resolved_by_user_id: null,
    bookings: [booking, { ...booking, id: 'booking-2', source_type: 'airbnb', guest_name: 'Imported guest' }],
  });
  vi.mocked(acknowledgeBookingConflict).mockResolvedValue({
    id: 'conflict-1',
    property_id: 'property-1',
    status: 'acknowledged',
    detected_at: '2026-08-01T00:00:00Z',
    acknowledged_at: '2026-08-01T01:00:00Z',
    acknowledged_by_user_id: 'user-1',
    resolution_note: 'Reviewed with the channel.',
    resolved_at: null,
    resolved_by_user_id: null,
    bookings: [booking],
  });
  vi.mocked(createManualBooking).mockResolvedValue(bookingDetail);
}

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date('2026-08-10T12:00:00Z'));
    configureApi();
  });

  it('renders live bookings with source and status text', async () => {
    render(<CalendarPage companyTimezone="Africa/Tunis" />);

    expect((await screen.findAllByText('Sami Guest')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Direct').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Confirmed').length).toBeGreaterThan(0);
    expect(screen.queryByText('Prototype calendar')).not.toBeInTheDocument();
  });

  it('opens booking details and exposes manual controls without exposing the raw payload', async () => {
    render(<CalendarPage companyTimezone="Africa/Tunis" />);
    fireEvent.click((await screen.findAllByRole('button', { name: /Sami Guest/i }))[0]);

    expect(await screen.findByRole('heading', { name: 'Booking details' })).toBeInTheDocument();
    expect(screen.getByText('Direct reservation note')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit entry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel booking/i })).toBeInTheDocument();
  });

  it('creates a confirmed manual blocked period with the validated payload', async () => {
    render(<CalendarPage companyTimezone="Africa/Tunis" />);
    fireEvent.click(await screen.findByRole('button', { name: /New direct booking/i }));
    fireEvent.change(screen.getByLabelText('Record type'), { target: { value: 'blocked_period' } });
    fireEvent.change(screen.getByLabelText(/Internal note/i), { target: { value: 'Maintenance window' } });
    fireEvent.click(screen.getByRole('button', { name: /Create entry/i }));

    await waitFor(() => expect(createManualBooking).toHaveBeenCalledWith(expect.objectContaining({
      property_id: 'property-1',
      source_type: 'manual',
      record_type: 'blocked_period',
      status: 'confirmed',
      guest_name: null,
      notes: 'Maintenance window',
    })));
  });

  it('acknowledges an open conflict and refreshes the live data', async () => {
    vi.mocked(fetchCalendarBookings).mockResolvedValue([
      booking,
      { ...booking, id: 'booking-2', source_type: 'airbnb', guest_name: 'Imported guest', check_in: '2026-08-11T10:00:00Z' },
    ]);
    vi.mocked(fetchBookingConflicts).mockResolvedValue([{
      id: 'conflict-1',
      property_id: 'property-1',
      status: 'open',
      detected_at: '2026-08-01T00:00:00Z',
      acknowledged_at: null,
      acknowledged_by_user_id: null,
      resolution_note: null,
      resolved_at: null,
      resolved_by_user_id: null,
      bookings: [booking, { ...booking, id: 'booking-2', source_type: 'airbnb', guest_name: 'Imported guest' }],
    }]);

    render(<CalendarPage companyTimezone="Africa/Tunis" />);
    fireEvent.click(await screen.findByRole('button', { name: /Conflict/i }));
    expect(await screen.findByRole('heading', { name: 'Booking conflict' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Acknowledgement note/i), { target: { value: 'Reviewed with the channel.' } });
    fireEvent.click(screen.getByRole('button', { name: /Acknowledge conflict/i }));

    await waitFor(() => expect(acknowledgeBookingConflict).toHaveBeenCalledWith('conflict-1', 'Reviewed with the channel.'));
  });

  it('shows a retryable partial-data failure instead of falling back to mock records', async () => {
    vi.mocked(fetchCalendarBookings).mockRejectedValue(new Error('Bookings API unavailable'));
    render(<CalendarPage companyTimezone="Africa/Tunis" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Bookings could not be loaded.');
    expect(screen.queryByText('Sami Guest')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry calendar data/i })).toBeInTheDocument();
  });
});
