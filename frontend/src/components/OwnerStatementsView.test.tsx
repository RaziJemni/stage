import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OwnerStatementsView } from './OwnerStatementsView';
import { I18nProvider } from '../i18n/I18nContext';
import * as ownersApi from '../api/owners';

vi.mock('../api/owners', () => ({
  fetchCompanyStatements: vi.fn(),
  getExportStatementUrl: vi.fn().mockImplementation((ownerId, year, month) => 
    `/api/v1/supervision/owner-statements/${ownerId}/export?year=${year}&month=${month}`
  ),
  getPrintStatementUrl: vi.fn().mockImplementation((ownerId, year, month) => 
    `/api/v1/supervision/owner-statements/${ownerId}/html?year=${year}&month=${month}`
  ),
  sendOwnerStatementEmail: vi.fn().mockResolvedValue({ success: true, sent_to_email: 'kamel@example.com' }),
  getOwnerStatementShareLink: vi.fn().mockResolvedValue({
    portal_url: 'http://localhost:5173/owner/statements?token=test-token-xyz',
    expires_at: '2026-10-16T20:00:00Z',
  }),
}));

const mockOverview: ownersApi.CompanyStatementsOverview = {
  year: 2026,
  month: 9,
  currency: 'TND',
  total_properties: 2,
  total_owners: 1,
  total_gross_revenue: 3500.0,
  total_commission: 700.0,
  total_maintenance_expenses: 150.0,
  total_net_payout: 2650.0,
  statements: [
    {
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
    },
  ],
};

function renderView(locale: 'en' | 'fr' = 'en') {
  return render(
    <I18nProvider initialLocale={locale}>
      <OwnerStatementsView defaultCurrency="TND" />
    </I18nProvider>
  );
}

describe('OwnerStatementsView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders summary financial KPIs and owner row', async () => {
    vi.mocked(ownersApi.fetchCompanyStatements).mockResolvedValue(mockOverview);

    renderView();

    await waitFor(() => {
      expect(screen.getAllByText('3500.000 TND').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getAllByText('700.000 TND').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('150.000 TND').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('2650.000 TND').length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('Kamel Trabelsi')).toBeInTheDocument();
    expect(screen.getByText('20.0%')).toBeInTheDocument();
  });

  it('opens detailed itemized statement modal on click', async () => {
    vi.mocked(ownersApi.fetchCompanyStatements).mockResolvedValue(mockOverview);

    renderView();

    await waitFor(() => {
      expect(screen.getByText('Kamel Trabelsi')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /View Details/i }));

    expect(screen.getByText(/Statement Details: Kamel Trabelsi/i)).toBeInTheDocument();
    expect(screen.getAllByText('Villa Carthage').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Sophie Martin')).toBeInTheDocument();
    expect(screen.getByText('Pool pump repair')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Close/i }));
    expect(screen.queryByText(/Statement Details: Kamel Trabelsi/i)).not.toBeInTheDocument();
  });

  it('renders empty state when there are no statements for the period', async () => {
    vi.mocked(ownersApi.fetchCompanyStatements).mockResolvedValue({
      ...mockOverview,
      total_gross_revenue: 0,
      total_commission: 0,
      total_maintenance_expenses: 0,
      total_net_payout: 0,
      statements: [],
    });

    renderView();

    await waitFor(() => {
      expect(screen.getByText(/No owner statements available for this period/i)).toBeInTheDocument();
    });
  });

  it('handles API error with retry button', async () => {
    vi.mocked(ownersApi.fetchCompanyStatements).mockRejectedValueOnce(new Error('Network error loading statements'));

    renderView();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error loading statements');
    });

    vi.mocked(ownersApi.fetchCompanyStatements).mockResolvedValueOnce(mockOverview);
    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));

    await waitFor(() => {
      expect(screen.getByText('Kamel Trabelsi')).toBeInTheDocument();
    });
  });

  it('triggers email dispatch when email action button is clicked', async () => {
    vi.mocked(ownersApi.fetchCompanyStatements).mockResolvedValue(mockOverview);

    renderView();

    await waitFor(() => {
      expect(screen.getByText('Kamel Trabelsi')).toBeInTheDocument();
    });

    const sendButtons = screen.getAllByTitle('Email statement');
    expect(sendButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(sendButtons[0]);

    await waitFor(() => {
      expect(ownersApi.sendOwnerStatementEmail).toHaveBeenCalledWith({
        owner_id: 'owner-1',
        year: 2026,
        month: 9,
      });
      expect(screen.getByText(/kamel@example.com/i)).toBeInTheDocument();
    });
  });

  it('generates and copies share link to clipboard', async () => {
    vi.mocked(ownersApi.fetchCompanyStatements).mockResolvedValue(mockOverview);
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    renderView();

    await waitFor(() => {
      expect(screen.getByText('Kamel Trabelsi')).toBeInTheDocument();
    });

    const shareButtons = screen.getAllByTitle('Share link');
    expect(shareButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(shareButtons[0]);

    await waitFor(() => {
      expect(ownersApi.getOwnerStatementShareLink).toHaveBeenCalledWith({
        owner_id: 'owner-1',
        year: 2026,
        month: 9,
      });
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost:5173/owner/statements?token=test-token-xyz');
    });
  });
});
