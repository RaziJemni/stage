import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarPage } from './CalendarPage';
import { fetchProperties } from '../api/properties';
import {
  acknowledgeBookingConflict,
  checkPropertyAvailability,
  createManualBooking,
  fetchBooking,
  fetchBookingConflict,
  fetchBookingConflicts,
  fetchCalendarBookings,
  fetchCalendarFeeds,
  updateManualBooking,
} from '../api/calendar';

vi.mock('../api/properties', () => ({
  fetchProperties: vi.fn(),
}));

vi.mock('../api/calendar', () => ({
  acknowledgeBookingConflict: vi.fn(),
  cancelManualBooking: vi.fn(),
  checkPropertyAvailability: vi.fn(),
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
  payment_status: 'unpaid' as const,
  total_amount: 1200,
  paid_amount: 0,
  payment_method: 'cash' as const,
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
  vi.mocked(updateManualBooking).mockResolvedValue({
    ...bookingDetail,
    status: 'tentative',
    notes: 'Edited during live verification',
  });
  vi.mocked(checkPropertyAvailability).mockResolvedValue({
    is_available: true,
    conflicting_bookings: [],
  });
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
    await screen.findByTestId('dates-available-badge');
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

  it('closes stale booking details and reloads current data after an edit', async () => {
    vi.mocked(fetchBooking)
      .mockResolvedValueOnce(bookingDetail)
      .mockResolvedValueOnce({
        ...bookingDetail,
        status: 'tentative',
        notes: 'Edited during live verification',
      });
    render(<CalendarPage companyTimezone="Africa/Tunis" />);
    fireEvent.click((await screen.findAllByRole('button', { name: /Sami Guest/i }))[0]);
    fireEvent.click(await screen.findByRole('button', { name: /Edit entry/i }));
    const editor = await screen.findByRole('dialog', { name: 'Edit booking' });
    fireEvent.change(editor.querySelector('select')!, { target: { value: 'tentative' } });
    fireEvent.change(screen.getByLabelText(/Internal note/i), { target: { value: 'Edited during live verification' } });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Booking details' })).not.toBeInTheDocument());
    fireEvent.click((await screen.findAllByRole('button', { name: /Sami Guest/i }))[0]);
    const detail = await screen.findByRole('dialog', { name: 'Booking details' });
    await waitFor(() => expect(detail).toHaveTextContent('Tentative'));
    expect(detail).toHaveTextContent('Edited during live verification');
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

  it('displays conflict warning and prevents submission until override is confirmed', async () => {
    vi.mocked(checkPropertyAvailability).mockResolvedValue({
      is_available: false,
      conflicting_bookings: [
        {
          id: 'booking-existing-1',
          property_id: 'property-1',
          channel_id: null,
          external_event_id: null,
          source_type: 'airbnb',
          record_type: 'reservation',
          status: 'confirmed',
          check_in: '2026-08-10T14:00:00Z',
          check_out: '2026-08-12T10:00:00Z',
          guest_name: 'Overlapping Guest',
        },
      ],
    });

    render(<CalendarPage companyTimezone="Africa/Tunis" />);
    fireEvent.click(await screen.findByRole('button', { name: /New direct booking/i }));

    // Wait for the conflict warning banner
    const warning = await screen.findByTestId('conflict-warning-banner');
    expect(warning).toBeInTheDocument();
    expect(within(warning).getByText('Overlapping Guest')).toBeInTheDocument();
    expect(within(warning).getByText('Airbnb')).toBeInTheDocument();

    // Fill in guest name
    fireEvent.change(screen.getByLabelText(/Guest name/i), { target: { value: 'New Guest' } });

    // Submit button should be disabled because override checkbox is unchecked
    const submitBtn = screen.getByRole('button', { name: /Create entry/i });
    expect(submitBtn).toBeDisabled();

    // Check the override checkbox
    const overrideCheckbox = screen.getByTestId('conflict-override-checkbox');
    fireEvent.click(overrideCheckbox);
    expect(overrideCheckbox).toBeChecked();
    expect(submitBtn).not.toBeDisabled();

    // Submit the form
    fireEvent.click(submitBtn);
    await waitFor(() =>
      expect(createManualBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          property_id: 'property-1',
          guest_name: 'New Guest',
        })
      )
    );
  });

  it('displays dates available badge when no conflict is detected', async () => {
    vi.mocked(checkPropertyAvailability).mockResolvedValue({
      is_available: true,
      conflicting_bookings: [],
    });

    render(<CalendarPage companyTimezone="Africa/Tunis" />);
    fireEvent.click(await screen.findByRole('button', { name: /New direct booking/i }));

    const availableBadge = await screen.findByTestId('dates-available-badge');
    expect(availableBadge).toBeInTheDocument();
    expect(screen.queryByTestId('conflict-warning-banner')).not.toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Create entry/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it('displays direct booking payment status badge and folio breakdown with unpaid balance callout', async () => {
    render(<CalendarPage companyTimezone="Africa/Tunis" />);
    fireEvent.click((await screen.findAllByRole('button', { name: /Sami Guest/i }))[0]);

    expect(await screen.findByRole('heading', { name: /Booking details|Détails de la réservation/i })).toBeInTheDocument();
    expect(screen.getByTestId('booking-payment-badge')).toHaveTextContent(/Unpaid|Non payé/i);
    expect(screen.getByTestId('booking-folio-card')).toBeInTheDocument();
    expect(screen.getByTestId('unpaid-balance-callout')).toHaveTextContent('1200.000 TND');
  });

  it('displays deposit received status and calculates outstanding balance in drawer', async () => {
    vi.mocked(fetchBooking).mockResolvedValueOnce({
      ...bookingDetail,
      payment_status: 'deposit_received',
      total_amount: 1500,
      paid_amount: 500,
      payment_method: 'bank_transfer',
    });

    render(<CalendarPage companyTimezone="Africa/Tunis" />);
    fireEvent.click((await screen.findAllByRole('button', { name: /Sami Guest/i }))[0]);

    expect(await screen.findByTestId('booking-payment-badge')).toHaveTextContent(/Deposit received|Acompte versé/i);
    expect(screen.getByTestId('unpaid-balance-callout')).toHaveTextContent('1000.000 TND');
    expect(screen.getByText('500.000 TND')).toBeInTheDocument();
    expect(screen.getByText(/Bank transfer|Virement bancaire/i)).toBeInTheDocument();
  });

  it('creates a direct reservation with payment status, total price, and payment method', async () => {
    render(<CalendarPage companyTimezone="Africa/Tunis" />);
    fireEvent.click(await screen.findByRole('button', { name: /New direct booking|Nouvelle réservation directe/i }));
    await screen.findByTestId('dates-available-badge');

    fireEvent.change(screen.getByLabelText(/Guest name|Nom du voyageur/i), { target: { value: 'Leila Guest' } });
    fireEvent.change(screen.getByLabelText(/Payment status|Statut du paiement/i), { target: { value: 'deposit_received' } });
    fireEvent.change(screen.getByLabelText(/Total price|Montant total/i), { target: { value: '2000' } });
    fireEvent.change(screen.getByLabelText(/Paid \/ Deposit|Montant payé \/ Acompte/i), { target: { value: '600' } });
    fireEvent.change(screen.getByLabelText(/Payment method|Mode de paiement/i), { target: { value: 'card' } });

    fireEvent.click(screen.getByRole('button', { name: /Create entry|Créer l'entrée/i }));

    await waitFor(() =>
      expect(createManualBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          property_id: 'property-1',
          source_type: 'direct',
          record_type: 'reservation',
          status: 'confirmed',
          guest_name: 'Leila Guest',
          payment_status: 'deposit_received',
          total_amount: 2000,
          paid_amount: 600,
          payment_method: 'card',
        })
      )
    );
  });

  it('displays settled indicator when reservation is paid in full', async () => {
    vi.mocked(fetchBooking).mockResolvedValueOnce({
      ...bookingDetail,
      payment_status: 'paid_in_full',
      total_amount: 950,
      paid_amount: 950,
      payment_method: 'cash',
    });

    render(<CalendarPage companyTimezone="Africa/Tunis" />);
    fireEvent.click((await screen.findAllByRole('button', { name: /Sami Guest/i }))[0]);

    expect(await screen.findByTestId('booking-payment-badge')).toHaveTextContent(/Paid in full|Payé intégralement/i);
    expect(screen.getByTestId('settled-balance-callout')).toHaveTextContent('0.000 TND');
    expect(screen.queryByTestId('unpaid-balance-callout')).not.toBeInTheDocument();
  });
});
