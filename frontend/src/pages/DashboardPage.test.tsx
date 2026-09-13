import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';
import { fetchBookingConflicts, fetchCalendarBookings } from '../api/calendar';
import { fetchAllConversations } from '../api/messaging';
import { fetchAllTickets } from '../api/maintenance';
import { I18nProvider } from '../i18n/I18nContext';
import { fetchPortfolioAnalytics } from '../api/supervision';

vi.mock('../api/calendar', () => ({ fetchBookingConflicts: vi.fn(), fetchCalendarBookings: vi.fn() }));
vi.mock('../api/messaging', () => ({ fetchAllConversations: vi.fn() }));
vi.mock('../api/maintenance', () => ({ fetchAllTickets: vi.fn() }));
vi.mock('../api/supervision', () => ({ fetchPortfolioAnalytics: vi.fn() }));

const properties = [{ id: 'property-1', name: 'Villa Yasmine' }] as any;
const page = (overrides = {}, locale: 'en' | 'fr' = 'en') => (
  <I18nProvider initialLocale={locale}>
    <DashboardPage properties={properties} companyTimezone="Africa/Tunis" onNavigate={vi.fn()} {...overrides} />
  </I18nProvider>
);

const mockAnalytics = {
  window_days: 30,
  start_date: '2026-08-27',
  end_date: '2026-09-26',
  total_properties: 1,
  occupancy_rate: 60.0,
  total_booked_nights: 18,
  total_reservations: 3,
  average_length_of_stay: 6.0,
  channel_distribution: [
    { channel: 'Airbnb', channel_key: 'airbnb', count: 2, nights: 12, percentage: 66.7 },
    { channel: 'Direct / Manual', channel_key: 'manual', count: 1, nights: 6, percentage: 33.3 },
  ],
  property_insights: [
    { property_id: 'property-1', property_name: 'Villa Yasmine', booked_nights: 18, occupancy_rate: 60.0 },
  ],
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchBookingConflicts).mockResolvedValue([{ id: 'conflict-1', property_id: 'property-1', status: 'open', bookings: [] }] as any);
    vi.mocked(fetchAllConversations).mockResolvedValue([{ id: 'conversation-1', property_id: 'property-1', handling_mode: 'manual', escalation_reason: 'complaint', last_message_at: '2026-08-26T10:00:00Z' }] as any);
    vi.mocked(fetchAllTickets).mockResolvedValue([{ id: 'ticket-1', property_id: 'property-1', title: 'Broken AC', status: 'in_progress', priority: 'urgent' }] as any);
    vi.mocked(fetchCalendarBookings).mockResolvedValue([]);
    vi.mocked(fetchPortfolioAnalytics).mockResolvedValue(mockAnalytics);
  });

  it('renders persisted attention items and opens their workflows', async () => {
    const onNavigate = vi.fn();
    render(page({ onNavigate }));
    await waitFor(() => expect(screen.getByText('Broken AC')).toBeInTheDocument());
    expect(screen.getByText(/complaint/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Calendar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Messages' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Maintenance' }));
    expect(onNavigate).toHaveBeenCalledWith('calendar');
    expect(onNavigate).toHaveBeenCalledWith('inbox');
    expect(onNavigate).toHaveBeenCalledWith('tickets');
  });

  it('switches to analytics tab and renders portfolio metrics and channel distribution', async () => {
    render(page());
    await waitFor(() => expect(screen.getByText('Broken AC')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Analytics & Insights/i }));

    expect(screen.getAllByText('60%')).toHaveLength(2);
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('Airbnb')).toBeInTheDocument();
    expect(screen.getByText(/66.7%/)).toBeInTheDocument();
    expect(screen.getAllByText('Villa Yasmine')).toHaveLength(2);
  });

  it('renders operational 30d occupancy tile and filters by property', async () => {
    render(page());
    await waitFor(() => expect(screen.getByText('Occupancy Rate (30d)')).toBeInTheDocument());
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText(/18 \/ 30 room-nights/)).toBeInTheDocument();

    const select = screen.getByLabelText('Filter property');
    fireEvent.change(select, { target: { value: 'property-1' } });

    await waitFor(() => {
      expect(fetchPortfolioAnalytics).toHaveBeenCalledWith(30, 'property-1');
    });
  });

  it('shows empty operational states when source APIs have no items', async () => {
    vi.mocked(fetchBookingConflicts).mockResolvedValue([]);
    vi.mocked(fetchAllConversations).mockResolvedValue([]);
    vi.mocked(fetchAllTickets).mockResolvedValue([]);
    render(page());
    await waitFor(() => expect(screen.getByText('No attention items right now')).toBeInTheDocument());
    expect(screen.getByText('No guest arrivals today.')).toBeInTheDocument();
    expect(screen.getByText('No guest departures today.')).toBeInTheDocument();
  });

  it('shows a retryable error when every source fails', async () => {
    vi.mocked(fetchBookingConflicts).mockRejectedValue(new Error('offline'));
    vi.mocked(fetchAllConversations).mockRejectedValue(new Error('offline'));
    vi.mocked(fetchAllTickets).mockRejectedValue(new Error('offline'));
    vi.mocked(fetchCalendarBookings).mockRejectedValue(new Error('offline'));
    vi.mocked(fetchPortfolioAnalytics).mockRejectedValue(new Error('offline'));
    render(page());
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Dashboard data could not be loaded'));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(fetchBookingConflicts).toHaveBeenCalledTimes(2);
  });

  it('renders French dashboard labels when locale is fr', async () => {
    vi.mocked(fetchBookingConflicts).mockResolvedValue([]);
    vi.mocked(fetchAllConversations).mockResolvedValue([]);
    vi.mocked(fetchAllTickets).mockResolvedValue([]);
    render(page({}, 'fr'));
    await waitFor(() => expect(screen.getByText('Centre de Commande Opérationnel')).toBeInTheDocument());
    expect(screen.getByText('Aucun élément d\'attention actuellement')).toBeInTheDocument();
    expect(screen.getByText('Aucune arrivée de voyageur aujourd\'hui.')).toBeInTheDocument();
    expect(screen.getByText('Aucun départ de voyageur aujourd\'hui.')).toBeInTheDocument();
  });
  it('polls only urgent attention sources in the background', async () => {
    vi.useFakeTimers();
    render(page());
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(fetchBookingConflicts).toHaveBeenCalledTimes(2);
    expect(fetchAllConversations).toHaveBeenCalledTimes(2);
    expect(fetchAllTickets).toHaveBeenCalledTimes(2);
    expect(fetchCalendarBookings).toHaveBeenCalledTimes(1);
    expect(fetchPortfolioAnalytics).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
