import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BookingReceiptModal } from './BookingReceiptModal';
import { I18nProvider } from '../i18n/I18nContext';
import * as calendarApi from '../api/calendar';

vi.mock('../api/calendar', () => ({
  fetchBookingReceiptData: vi.fn(),
  getBookingReceiptHtmlUrl: vi.fn().mockImplementation((bookingId, lang) => 
    `/api/v1/bookings/${bookingId}/receipt?lang=${lang}`
  ),
}));

const mockReceipt: calendarApi.BookingReceiptData = {
  invoice_number: 'VAY-202609-ABCD1234',
  issue_date: '2026-09-14T10:00:00Z',
  booking_id: 'bk-123',
  property_id: 'prop-456',
  company_name: 'Dars & Villas Sidi Bou Said',
  property_name: 'Dar Fatma',
  property_address: '12 Rue Sidi Bou Said',
  property_city: 'Sidi Bou Said',
  guest_name: 'Leila Trabelsi',
  guest_contact: '+216 22 333 444',
  check_in: '2026-09-20T14:00:00Z',
  check_out: '2026-09-23T10:00:00Z',
  check_in_time: '15:00',
  check_out_time: '11:00',
  nights: 3,
  currency: 'TND',
  unit_nightly_rate: 250.0,
  total_amount: 750.0,
  paid_amount: 750.0,
  outstanding_balance: 0.0,
  payment_status: 'paid_in_full',
  payment_method: 'cash',
  status: 'confirmed',
  source_type: 'direct',
  notes: 'Arrivée tardive vers 18h',
};

describe('BookingReceiptModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders receipt details correctly when loaded', async () => {
    vi.mocked(calendarApi.fetchBookingReceiptData).mockResolvedValue(mockReceipt);

    render(
      <I18nProvider initialLocale="fr">
        <BookingReceiptModal bookingId="bk-123" onClose={() => {}} />
      </I18nProvider>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('receipt-invoice-num')).toHaveTextContent('VAY-202609-ABCD1234');
    });

    expect(screen.getByText('Leila Trabelsi')).toBeInTheDocument();
    expect(screen.getAllByText('Dar Fatma').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('receipt-total-amount')).toHaveTextContent('750.000 TND');
    expect(screen.getByTestId('receipt-paid-amount')).toHaveTextContent('750.000 TND');
    expect(screen.getByTestId('receipt-balance-amount')).toHaveTextContent('0.000 TND');
    expect(screen.getByTestId('receipt-payment-status')).toHaveTextContent('Payé intégralement');
    expect(screen.getByText('Arrivée tardive vers 18h')).toBeInTheDocument();
  });

  it('triggers print window on print button click', async () => {
    vi.mocked(calendarApi.fetchBookingReceiptData).mockResolvedValue(mockReceipt);
    const mockOpen = vi.fn();
    vi.stubGlobal('open', mockOpen);

    render(
      <I18nProvider initialLocale="fr">
        <BookingReceiptModal bookingId="bk-123" onClose={() => {}} />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('receipt-print-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('receipt-print-btn'));
    expect(mockOpen).toHaveBeenCalledWith('/api/v1/bookings/bk-123/receipt?lang=fr', '_blank');

    vi.unstubAllGlobals();
  });

  it('renders cancelled watermark when booking is cancelled', async () => {
    vi.mocked(calendarApi.fetchBookingReceiptData).mockResolvedValue({
      ...mockReceipt,
      status: 'cancelled',
    });

    render(
      <I18nProvider initialLocale="fr">
        <BookingReceiptModal bookingId="bk-123" onClose={() => {}} />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('receipt-cancelled-watermark')).toBeInTheDocument();
    });
    expect(screen.getByText(/ANNULÉE \/ CANCELLED/i)).toBeInTheDocument();
  });

  it('renders partial payment with deposit and balance due', async () => {
    vi.mocked(calendarApi.fetchBookingReceiptData).mockResolvedValue({
      ...mockReceipt,
      total_amount: 1000.0,
      paid_amount: 400.0,
      outstanding_balance: 600.0,
      payment_status: 'deposit_received',
      payment_method: 'bank_transfer',
    });

    render(
      <I18nProvider initialLocale="fr">
        <BookingReceiptModal bookingId="bk-123" onClose={() => {}} />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('receipt-total-amount')).toHaveTextContent('1000.000 TND');
    });

    expect(screen.getByTestId('receipt-paid-amount')).toHaveTextContent('400.000 TND');
    expect(screen.getByTestId('receipt-balance-amount')).toHaveTextContent('600.000 TND');
    expect(screen.getByTestId('receipt-payment-status')).toHaveTextContent('Acompte versé');
    expect(screen.getByText('Virement bancaire')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    vi.mocked(calendarApi.fetchBookingReceiptData).mockResolvedValue(mockReceipt);
    const handleClose = vi.fn();

    render(
      <I18nProvider initialLocale="fr">
        <BookingReceiptModal bookingId="bk-123" onClose={handleClose} />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Fermer')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Fermer'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
