import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import { AuthProvider } from './auth/AuthContext';
import * as propertiesApi from './api/properties';
import * as messagingApi from './api/messaging';
import * as calendarApi from './api/calendar';
import * as maintenanceApi from './api/maintenance';
import * as supervisionApi from './api/supervision';

vi.mock('./api/properties');
vi.mock('./api/messaging');
vi.mock('./api/calendar');
vi.mock('./api/maintenance');
vi.mock('./api/supervision');
vi.mock('./components/TeamManagementPanel', () => ({ TeamManagementPanel: () => <div>Team panel</div> }));

const managerUserFr = {
  id: 'user-1',
  name: 'Manager Yasmine',
  email: 'yasmine@example.com',
  role: 'manager' as const,
  status: 'active' as const,
  preferred_language: 'fr',
};

const managerUserEn = {
  ...managerUserFr,
  preferred_language: 'en',
};

const company = {
  id: 'company-1',
  name: 'Vayca Luxury Rentals',
  timezone: 'Africa/Tunis',
  default_currency: 'TND',
};

const authResponseFr = {
  user: managerUserFr,
  company,
  permissions: ['operations:access'],
};

const authResponseEn = {
  user: managerUserEn,
  company,
  permissions: ['operations:access'],
};

describe('App + AuthProvider language preference integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    document.cookie = 'vayca_csrf=test-csrf-token; path=/';

    vi.mocked(propertiesApi.fetchProperties).mockResolvedValue({
      items: [],
      page: 1,
      page_size: 20,
      total: 0,
      pages: 0,
    });
    vi.mocked(messagingApi.fetchConversations).mockResolvedValue({
      items: [],
      page: 1,
      page_size: 20,
      total: 0,
      pages: 0,
    });
    vi.mocked(messagingApi.fetchUnreadConversationCount).mockResolvedValue(0);
    vi.mocked(messagingApi.fetchConversationCount).mockResolvedValue(0);
    vi.mocked(calendarApi.fetchBookingConflicts).mockResolvedValue([]);
    vi.mocked(calendarApi.fetchCalendarBookings).mockResolvedValue([]);
    vi.mocked(calendarApi.fetchCalendarFeeds).mockResolvedValue([]);
    vi.mocked(maintenanceApi.fetchTickets).mockResolvedValue({ items: [], page: 1, page_size: 20, total: 0, pages: 0 });
    vi.mocked(maintenanceApi.fetchTicketSuggestions).mockResolvedValue({ items: [], page: 1, page_size: 20, total: 0, pages: 0 });
    vi.mocked(maintenanceApi.fetchContractors).mockResolvedValue({ items: [], page: 1, page_size: 20, total: 0, pages: 0 });
    vi.mocked(maintenanceApi.fetchAllTickets).mockResolvedValue([]);
    vi.mocked(supervisionApi.fetchPortfolioAnalytics).mockResolvedValue({
      window_days: 30,
      start_date: '2026-08-27',
      end_date: '2026-09-26',
      total_properties: 0,
      occupancy_rate: 0,
      total_booked_nights: 0,
      total_reservations: 0,
      average_length_of_stay: 0,
      channel_distribution: [],
      property_insights: [],
    });
  });

  it('keeps active session in English when persisted "fr" user selects English in Settings', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();

      if (url.includes('/api/v1/auth/me')) {
        return new Response(JSON.stringify(authResponseFr), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.includes('/api/v1/auth/preferences') && method === 'PATCH') {
        const body = JSON.parse(String(init?.body || '{}'));
        expect(body).toEqual({ preferred_language: 'en' });
        return new Response(JSON.stringify(authResponseEn), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({}), { status: 200 });
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );

    // Initial load in French from auth identity
    expect(await screen.findByText('Centre de Commande Opérationnel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Paramètres/i })).toBeInTheDocument();

    // Navigate to Settings
    fireEvent.click(screen.getByRole('button', { name: /Paramètres/i }));
    expect(await screen.findByRole('heading', { name: "Paramètres de l'entreprise & Accès équipe" })).toBeInTheDocument();

    // Switch to Preferences tab
    fireEvent.click(screen.getByRole('button', { name: /Préférences & Langue/i }));
    expect(screen.getByRole('heading', { name: "Langue de l'interface" })).toBeInTheDocument();

    // Click English button
    const englishBtn = screen.getByRole('button', { name: /Select English/i });
    fireEvent.click(englishBtn);

    // Verify PATCH /api/v1/auth/preferences was called
    await waitFor(() => {
      const prefCalls = fetchMock.mock.calls.filter(([callUrl, callInit]) => 
        String(callUrl).includes('/api/v1/auth/preferences') && callInit?.method === 'PATCH'
      );
      expect(prefCalls.length).toBe(1);
    });

    // Verify session remains in English and does not revert to French
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Interface Language' })).toBeInTheDocument();
      expect(screen.getByText('Company Settings & Team Access')).toBeInTheDocument();
      expect(window.localStorage.getItem('vayca_locale')).toBe('en');
    });

    // Ensure it remains in English after another delay
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByRole('heading', { name: 'Interface Language' })).toBeInTheDocument();
    expect(window.localStorage.getItem('vayca_locale')).toBe('en');
  });

  it('reverts to French and displays error alert when PATCH /auth/preferences fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();

      if (url.includes('/api/v1/auth/me')) {
        return new Response(JSON.stringify(authResponseFr), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.includes('/api/v1/auth/preferences') && method === 'PATCH') {
        return new Response(
          JSON.stringify({
            title: 'Internal Server Error',
            detail: 'Database unreachable.',
            status: 500,
            code: 'db_error',
          }),
          { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
        );
      }

      return new Response(JSON.stringify({}), { status: 200 });
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );

    // Initial load in French
    expect(await screen.findByText('Centre de Commande Opérationnel')).toBeInTheDocument();

    // Navigate to Settings -> Preferences
    fireEvent.click(screen.getByRole('button', { name: /Paramètres/i }));
    expect(await screen.findByRole('heading', { name: "Paramètres de l'entreprise & Accès équipe" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Préférences & Langue/i }));

    // Click English button
    const englishBtn = screen.getByRole('button', { name: /Select English/i });
    fireEvent.click(englishBtn);

    // Wait for failure rollback
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Database unreachable.');
      expect(screen.getByRole('heading', { name: "Langue de l'interface" })).toBeInTheDocument();
      expect(window.localStorage.getItem('vayca_locale')).toBe('fr');
    });

    consoleErrorSpy.mockRestore();
  });
});
