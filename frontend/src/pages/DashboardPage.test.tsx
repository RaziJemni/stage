import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';
import { fetchBookingConflicts, fetchCalendarBookings } from '../api/calendar';
import { fetchAllConversations } from '../api/messaging';
import { fetchAllTickets } from '../api/maintenance';
import { I18nProvider } from '../i18n/I18nContext';

vi.mock('../api/calendar', () => ({ fetchBookingConflicts: vi.fn(), fetchCalendarBookings: vi.fn() }));
vi.mock('../api/messaging', () => ({ fetchAllConversations: vi.fn() }));
vi.mock('../api/maintenance', () => ({ fetchAllTickets: vi.fn() }));

const properties = [{ id: 'property-1', name: 'Villa Yasmine' }] as any;
const page = (overrides = {}, locale: 'en' | 'fr' = 'en') => (
  <I18nProvider initialLocale={locale}>
    <DashboardPage properties={properties} companyTimezone="Africa/Tunis" onNavigate={vi.fn()} {...overrides} />
  </I18nProvider>
);

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchBookingConflicts).mockResolvedValue([{ id: 'conflict-1', property_id: 'property-1', status: 'open', bookings: [] }] as any);
    vi.mocked(fetchAllConversations).mockResolvedValue([{ id: 'conversation-1', property_id: 'property-1', handling_mode: 'manual', escalation_reason: 'complaint', last_message_at: '2026-08-26T10:00:00Z' }] as any);
    vi.mocked(fetchAllTickets).mockResolvedValue([{ id: 'ticket-1', property_id: 'property-1', title: 'Broken AC', status: 'in_progress', priority: 'urgent' }] as any);
    vi.mocked(fetchCalendarBookings).mockResolvedValue([]);
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
});
