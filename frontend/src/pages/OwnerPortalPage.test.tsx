import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OwnerPortalPage } from './OwnerPortalPage';
import { I18nProvider } from '../i18n/I18nContext';
import * as ownersApi from '../api/owners';

vi.mock('../api/owners', () => ({
  fetchPublicOwnerStatement: vi.fn(),
  getPublicPrintStatementUrl: vi.fn().mockImplementation((token: string) => `/api/v1/public/owner-statements/html?token=${token}`),
  getPublicExportStatementUrl: vi.fn().mockImplementation((token: string) => `/api/v1/public/owner-statements/export?token=${token}`),
}));

const mockStatement: ownersApi.OwnerMonthlyStatement = {
  owner_id: 'owner-1',
  owner_name: 'Kamel Trabelsi',
  email: 'kamel@example.com',
  phone: '+216 98 000 111',
  commission_percentage: 20.0,
  year: 2026,
  month: 9,
  currency: 'TND',
  properties_count: 2,
  bookings_count: 3,
  gross_revenue: 3500.0,
  commission_amount: 700.0,
  maintenance_expenses: 150.0,
  net_payout: 2650.0,
  properties: [
    {
      property_id: 'prop-1',
      property_name: 'Villa Carthage',
      bookings_count: 2,
      gross_revenue: 2500.0,
      commission_percentage: 20.0,
      commission_amount: 500.0,
      maintenance_expenses: 100.0,
      net_payout: 1900.0,
    },
    {
      property_id: 'prop-2',
      property_name: 'Sidi Bou Said Loft',
      bookings_count: 1,
      gross_revenue: 1000.0,
      commission_percentage: 20.0,
      commission_amount: 200.0,
      maintenance_expenses: 50.0,
      net_payout: 750.0,
    },
  ],
  bookings: [
    {
      booking_id: 'book-1',
      property_id: 'prop-1',
      property_name: 'Villa Carthage',
      guest_name: 'Sophie Martin',
      source_type: 'direct',
      check_in: '2026-09-01T14:00:00Z',
      check_out: '2026-09-07T10:00:00Z',
      total_amount: 1500.0,
      paid_amount: 1500.0,
      payment_status: 'settled',
    },
  ],
  maintenance_tickets: [
    {
      ticket_id: 'tkt-1',
      property_id: 'prop-1',
      property_name: 'Villa Carthage',
      title: 'Pool pump repair',
      category: 'pool',
      resolved_at: '2026-09-05T12:00:00Z',
      cost: 150.0,
    },
  ],
};

function renderPage(initialEntry = '/owner/statements?token=valid-secret-token') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <I18nProvider initialLocale="en">
        <OwnerPortalPage />
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('OwnerPortalPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders invalid token message when token parameter is missing', async () => {
    renderPage('/owner/statements');

    await waitFor(() => {
      expect(screen.getByText(/Invalid, expired, or revoked statement link/i)).toBeInTheDocument();
    });
    expect(ownersApi.fetchPublicOwnerStatement).not.toHaveBeenCalled();
  });

  it('fetches statement and displays KPIs, owner info and property breakdown', async () => {
    vi.mocked(ownersApi.fetchPublicOwnerStatement).mockResolvedValue(mockStatement);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Kamel Trabelsi')).toBeInTheDocument();
    });

    expect(screen.getByText('3500.000 TND')).toBeInTheDocument();
    expect(screen.getByText('-700.000 TND')).toBeInTheDocument();
    expect(screen.getByText('-150.000 TND')).toBeInTheDocument();
    expect(screen.getByText('2650.000 TND')).toBeInTheDocument();

    expect(screen.getByText('Villa Carthage')).toBeInTheDocument();
    expect(screen.getByText('Sidi Bou Said Loft')).toBeInTheDocument();
  });

  it('switches between Overview, Bookings, and Maintenance Tickets tabs', async () => {
    vi.mocked(ownersApi.fetchPublicOwnerStatement).mockResolvedValue(mockStatement);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Kamel Trabelsi')).toBeInTheDocument();
    });

    // Bookings tab
    const bookingsTab = screen.getByRole('button', { name: /Completed Stays/i });
    fireEvent.click(bookingsTab);

    expect(screen.getByText('Sophie Martin')).toBeInTheDocument();
    expect(screen.getByText('direct')).toBeInTheDocument();

    // Tickets tab
    const ticketsTab = screen.getByRole('button', { name: /Deductible Maintenance/i });
    fireEvent.click(ticketsTab);

    expect(screen.getByText('Pool pump repair')).toBeInTheDocument();
    expect(screen.getAllByText('-150.000 TND').length).toBeGreaterThanOrEqual(1);
  });

  it('handles API rejection due to expired or revoked token', async () => {
    vi.mocked(ownersApi.fetchPublicOwnerStatement).mockRejectedValue(
      new Error('This statement link has expired. Please request a new link from your property manager.')
    );

    renderPage('/owner/statements?token=expired-token');

    await waitFor(() => {
      expect(
        screen.getByText(/This statement link has expired. Please request a new link from your property manager./i)
      ).toBeInTheDocument();
    });
  });

  it('configures print and export CSV links with token', async () => {
    vi.mocked(ownersApi.fetchPublicOwnerStatement).mockResolvedValue(mockStatement);

    renderPage('/owner/statements?token=my-special-token');

    await waitFor(() => {
      expect(screen.getByText('Kamel Trabelsi')).toBeInTheDocument();
    });

    const printLink = screen.getByRole('link', { name: /Print \/ PDF/i });
    expect(printLink).toHaveAttribute('href', '/api/v1/public/owner-statements/html?token=my-special-token');

    const exportLink = screen.getByRole('link', { name: /Download CSV/i });
    expect(exportLink).toHaveAttribute('href', '/api/v1/public/owner-statements/export?token=my-special-token');
  });
});
