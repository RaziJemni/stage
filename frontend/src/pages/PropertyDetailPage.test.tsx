import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PropertyDetailPage } from './PropertyDetailPage';
import { fetchCalendarBookings, type CalendarBooking } from '../api/calendar';
import { I18nProvider } from '../i18n/I18nContext';
import type { Property } from '../data/mockData';

vi.mock('../api/calendar', () => ({
  fetchCalendarBookings: vi.fn(),
}));

const mockProperty: Property = {
  id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  name: 'Dar Sidi Bou Said',
  location: 'Sidi Bou Said',
  city: 'Tunis',
  bedrooms: 3,
  bathrooms: 2,
  maxGuests: 6,
  nightlyRateTND: 250,
  status: 'Available',
  imageUrl: '',
  rating: 4.8,
  wifiSSID: 'SidiBouSaid_Guest',
  wifiPass: 'dar_guest_2026',
  doorCode: '4829#',
  checkInTime: '14:00',
  checkOutTime: '11:00',
  trashSchedule: 'Tuesday, Friday',
  houseRules: ['No smoking inside', 'Quiet hours after 22:00'],
  emergencyContact: '+216 71 000 111',
};

const mockBookings: CalendarBooking[] = [
  {
    id: 'booking-1',
    property_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    source_type: 'airbnb',
    record_type: 'reservation',
    status: 'confirmed',
    check_in: '2026-09-01T14:00:00Z',
    check_out: '2026-09-05T11:00:00Z',
    guest_name: 'Sophie Martin',
  },
  {
    id: 'booking-2',
    property_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    source_type: 'booking_com',
    record_type: 'reservation',
    status: 'tentative',
    check_in: '2026-09-10T14:00:00Z',
    check_out: '2026-09-15T11:00:00Z',
    guest_name: 'Karim Ben Salem',
  },
  {
    id: 'booking-3',
    property_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    source_type: 'manual',
    record_type: 'blocked_period',
    status: 'confirmed',
    check_in: '2026-09-20T00:00:00Z',
    check_out: '2026-09-22T00:00:00Z',
    guest_name: 'Maintenance Block',
  },
  {
    id: 'booking-cancelled',
    property_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    source_type: 'airbnb',
    record_type: 'reservation',
    status: 'cancelled',
    check_in: '2026-09-25T14:00:00Z',
    check_out: '2026-09-28T11:00:00Z',
    guest_name: 'Cancelled Guest',
  },
];

function renderWithLocale(ui: React.ReactElement, locale: 'en' | 'fr' = 'fr') {
  return render(
    <I18nProvider initialLocale={locale}>
      {ui}
    </I18nProvider>
  );
}

describe('PropertyDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchCalendarBookings).mockResolvedValue(mockBookings);
  });

  it('renders WorkstationHeader and French property overview by default', async () => {
    renderWithLocale(<PropertyDetailPage property={mockProperty} isManager={true} />, 'fr');

    // WorkstationHeader elements
    expect(screen.getByText('OPÉRATIONS')).toBeInTheDocument();
    expect(screen.getByText('Propriétés')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Dar Sidi Bou Said' })).toBeInTheDocument();
    expect(screen.getByText(/Sidi Bou Said \(Tunis, Tunisia\)/)).toBeInTheDocument();
    expect(screen.getByText(/Capacité max 6 voyageurs/)).toBeInTheDocument();
    expect(screen.getByText('No smoking inside')).toBeInTheDocument();
    expect(screen.getByText('Quiet hours after 22:00')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchCalendarBookings).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        })
      );
    });
  });

  it('fetches live upcoming bookings and renders active reservations in French', async () => {
    renderWithLocale(<PropertyDetailPage property={mockProperty} isManager={true} />, 'fr');

    await waitFor(() => {
      expect(screen.getByText('Sophie Martin')).toBeInTheDocument();
    });

    expect(screen.getByText('Karim Ben Salem')).toBeInTheDocument();
    expect(screen.getByText('Maintenance Block')).toBeInTheDocument();
    expect(screen.getByText('3 Actives')).toBeInTheDocument();
    expect(screen.getByText('Airbnb')).toBeInTheDocument();
    expect(screen.getByText('Booking.com')).toBeInTheDocument();
    expect(screen.getByText('Provisoire')).toBeInTheDocument();
    // Cancelled booking must not be shown in active upcoming list
    expect(screen.queryByText('Cancelled Guest')).not.toBeInTheDocument();
  });

  it('renders loading state while fetching upcoming bookings', async () => {
    let resolveBookings: (value: CalendarBooking[]) => void;
    const bookingPromise = new Promise<CalendarBooking[]>((resolve) => {
      resolveBookings = resolve;
    });
    vi.mocked(fetchCalendarBookings).mockReturnValueOnce(bookingPromise);

    renderWithLocale(<PropertyDetailPage property={mockProperty} isManager={true} />, 'fr');

    expect(screen.getByRole('status')).toHaveTextContent(/Chargement des réservations à venir/i);

    resolveBookings!(mockBookings);

    await waitFor(() => {
      expect(screen.getByText('Sophie Martin')).toBeInTheDocument();
    });
  });

  it('renders truthful empty state when no upcoming bookings exist', async () => {
    vi.mocked(fetchCalendarBookings).mockResolvedValueOnce([]);

    renderWithLocale(<PropertyDetailPage property={mockProperty} isManager={true} />, 'fr');

    await waitFor(() => {
      expect(screen.getByTestId('empty-bookings')).toBeInTheDocument();
    });
    expect(screen.getByText('Aucune réservation à venir pour cette propriété.')).toBeInTheDocument();
    expect(screen.getByText('0 Actives')).toBeInTheDocument();
  });

  it('renders retryable error banner when fetching bookings fails and retries on click', async () => {
    vi.mocked(fetchCalendarBookings).mockRejectedValueOnce(new Error('Network connection failed.'));

    renderWithLocale(<PropertyDetailPage property={mockProperty} isManager={true} />, 'fr');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network connection failed.');
    });

    vi.mocked(fetchCalendarBookings).mockResolvedValueOnce(mockBookings);
    fireEvent.click(screen.getByRole('button', { name: /Réessayer/i }));

    await waitFor(() => {
      expect(screen.getByText('Sophie Martin')).toBeInTheDocument();
    });
    expect(fetchCalendarBookings).toHaveBeenCalledTimes(2);
  });

  it('switches between overview and secret credentials tabs in French', async () => {
    renderWithLocale(<PropertyDetailPage property={mockProperty} isManager={true} />, 'fr');

    fireEvent.click(screen.getByRole('button', { name: /Codes d'accès secrets/i }));

    expect(screen.getByText("Identifiants d'accès confidentiels")).toBeInTheDocument();
    expect(screen.getByText('SidiBouSaid_Guest')).toBeInTheDocument();
    expect(screen.getByText('4829#')).toBeInTheDocument();
    expect(screen.getByText('+216 71 000 111')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Aperçu & Consignes/i }));
    expect(screen.getByText('No smoking inside')).toBeInTheDocument();
  });

  it('renders edit and archive buttons for manager, hides them for staff', () => {
    const { rerender } = renderWithLocale(<PropertyDetailPage property={mockProperty} isManager={true} />, 'fr');
    expect(screen.getByRole('button', { name: /Modifier la propriété/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Archiver/i })).toBeInTheDocument();

    rerender(
      <I18nProvider initialLocale="fr">
        <PropertyDetailPage property={mockProperty} isManager={false} />
      </I18nProvider>
    );
    expect(screen.queryByRole('button', { name: /Modifier la propriété/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Archiver/i })).not.toBeInTheDocument();
  });

  it('switches language dynamically to English', async () => {
    renderWithLocale(<PropertyDetailPage property={mockProperty} isManager={true} />, 'en');

    expect(screen.getByText('OPERATIONS')).toBeInTheDocument();
    expect(screen.getByText('Properties')).toBeInTheDocument();
    expect(screen.getByText(/Max 6 Guests Capacity/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Sophie Martin')).toBeInTheDocument();
    });
    expect(screen.getByText('3 Active')).toBeInTheDocument();
    expect(screen.getByText('Tentative')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit Property/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Archive/i })).toBeInTheDocument();
  });
});
