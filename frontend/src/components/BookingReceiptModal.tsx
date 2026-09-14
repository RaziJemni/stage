import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  ExternalLink,
  FileText,
  Loader2,
  Printer,
  User,
  X,
} from 'lucide-react';
import {
  fetchBookingReceiptData,
  getBookingReceiptHtmlUrl,
  type BookingReceiptData,
} from '../api/calendar';
import { useI18n } from '../i18n/I18nContext';

interface BookingReceiptModalProps {
  bookingId: string;
  onClose: () => void;
}

export const BookingReceiptModal: React.FC<BookingReceiptModalProps> = ({
  bookingId,
  onClose,
}) => {
  const { t, locale } = useI18n();
  const [receipt, setReceipt] = useState<BookingReceiptData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchBookingReceiptData(bookingId);
        if (active) {
          setReceipt(data);
        }
      } catch (err: unknown) {
        if (active) {
          setError(
            err instanceof Error ? err.message : t('common.generic_error') || 'Failed to load receipt'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [bookingId, t]);

  const handlePrint = () => {
    const printUrl = getBookingReceiptHtmlUrl(bookingId, locale);
    const win = window.open(printUrl, '_blank');
    if (win) {
      win.focus();
    }
  };

  const handleOpenTab = () => {
    const url = getBookingReceiptHtmlUrl(bookingId, locale);
    window.open(url, '_blank');
  };

  const formatMoney = (val: number | string | null | undefined, currency = 'TND'): string => {
    if (val === null || val === undefined || val === '') return `— ${currency}`;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? `— ${currency}` : `${num.toFixed(3)} ${currency}`;
  };

  const formatDate = (isoStr: string): string => {
    try {
      const d = new Date(isoStr);
      return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);
    } catch {
      return isoStr;
    }
  };

  const paymentStatusBadgeClasses: Record<string, string> = {
    paid_in_full: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    deposit_received: 'bg-[#F0F6FA] text-[#0F3D5E] border-[#B6DAEA]',
    unpaid: 'bg-amber-50 text-amber-900 border-amber-200',
  };

  const paymentStatusLabels: Record<string, string> = {
    paid_in_full: t('calendar.payment_paid_in_full'),
    deposit_received: t('calendar.payment_deposit_received'),
    unpaid: t('calendar.payment_unpaid'),
  };

  const methodLabels: Record<string, string> = {
    cash: t('calendar.method_cash'),
    bank_transfer: t('calendar.method_bank_transfer'),
    card: t('calendar.method_card'),
    check: t('calendar.method_check'),
    other: t('calendar.method_other'),
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-receipt-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl border border-[#EBE6DD] overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between border-b border-[#EBE6DD] bg-[#0F3D5E] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/10 p-2">
              <FileText className="h-5 w-5 text-[#E8A838]" />
            </div>
            <div>
              <h2 id="booking-receipt-modal-title" className="text-base font-bold">
                {t('calendar.receipt_title')}
              </h2>
              {receipt && (
                <p className="font-mono text-xs text-white/80">{receipt.invoice_number}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {receipt && (
              <>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#E8A838] px-3 py-1.5 text-xs font-bold text-[#1C1B18] shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
                  data-testid="receipt-print-btn"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>{t('calendar.receipt_print')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenTab}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer"
                  title={t('calendar.receipt_open_tab')}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>{t('calendar.receipt_open_tab')}</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close') || 'Close'}
              className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#FAF8F5]">
          {loading && (
            <div role="status" className="flex flex-col items-center justify-center py-16 text-xs text-[#78716C] gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-[#0F3D5E]" />
              <span>{t('common.loading') || 'Loading...'}</span>
            </div>
          )}

          {error && (
            <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && receipt && (
            <div className="relative rounded-xl border border-[#EBE6DD] bg-white p-6 shadow-xs space-y-6 text-[#1C1B18]">
              {receipt.status === 'cancelled' && (
                <div
                  data-testid="receipt-cancelled-watermark"
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                >
                  <span className="rotate-[-20deg] border-4 border-dashed border-rose-300 px-8 py-3 text-4xl font-extrabold uppercase tracking-widest text-rose-300/40">
                    ANNULÉE / CANCELLED
                  </span>
                </div>
              )}

              {/* Receipt Header Banner */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#FAF8F5] pb-4">
                <div>
                  <div className="text-xl font-extrabold text-[#0F3D5E] tracking-tight">VAYCA</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#D96B43]">
                    Sidi Bou Said Hospitality
                  </div>
                  <div className="mt-1 text-xs text-[#78716C]">{receipt.company_name}</div>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-md bg-[#F0F6FA] px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#0F3D5E]">
                    VOUCHER
                  </span>
                  <div className="mt-1 font-mono text-base font-extrabold text-[#1C1B18]" data-testid="receipt-invoice-num">
                    {receipt.invoice_number}
                  </div>
                  <div className="text-[11px] text-[#78716C]">
                    {t('calendar.receipt_issue_date')}: {formatDate(receipt.issue_date)}
                  </div>
                </div>
              </div>

              {/* Info Grid (Guest & Property) */}
              <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#78716C]">
                    <User className="h-3 w-3" />
                    <span>{t('calendar.receipt_guest')}</span>
                  </div>
                  <div className="font-bold text-sm text-[#1C1B18]">
                    {receipt.guest_name || t('calendar.conflict_guest')}
                  </div>
                  {receipt.guest_contact && (
                    <div className="text-xs text-[#57534E]">{receipt.guest_contact}</div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#78716C]">
                    <Building2 className="h-3 w-3" />
                    <span>{t('calendar.receipt_property')}</span>
                  </div>
                  <div className="font-bold text-sm text-[#1C1B18]">{receipt.property_name}</div>
                  <div className="text-xs text-[#57534E]">
                    {receipt.property_city || 'Tunisie'}
                    {receipt.property_address ? `, ${receipt.property_address}` : ''}
                  </div>
                </div>
              </div>

              {/* Stay Dates & Duration Card */}
              <div className="grid gap-4 sm:grid-cols-3 rounded-xl border border-[#B6DAEA] bg-[#F0F6FA] p-4 items-center">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#0F3D5E]">
                    {t('calendar.receipt_check_in')}
                  </div>
                  <div className="mt-1 font-bold text-sm text-[#1C1B18]">
                    {formatDate(receipt.check_in)}
                  </div>
                  <div className="text-[11px] text-[#78716C]">{receipt.check_in_time || '15:00'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#0F3D5E]">
                    {t('calendar.receipt_check_out')}
                  </div>
                  <div className="mt-1 font-bold text-sm text-[#1C1B18]">
                    {formatDate(receipt.check_out)}
                  </div>
                  <div className="text-[11px] text-[#78716C]">{receipt.check_out_time || '11:00'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#0F3D5E]">
                    {t('calendar.receipt_total')}
                  </div>
                  <div className="mt-1 font-bold text-sm text-[#1C1B18]">
                    {receipt.nights}{' '}
                    {receipt.nights > 1 ? t('calendar.receipt_nights') : t('calendar.receipt_night')}
                  </div>
                  <span
                    className={`inline-block mt-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                      receipt.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : receipt.status === 'cancelled'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {receipt.status}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#EBE6DD] bg-[#FAF8F5] text-[#78716C]">
                      <th className="py-2.5 px-3 uppercase tracking-wider font-bold">
                        {t('calendar.receipt_accommodation')}
                      </th>
                      <th className="py-2.5 px-3 text-right uppercase tracking-wider font-bold">
                        {t('calendar.receipt_total')}
                      </th>
                      <th className="py-2.5 px-3 text-right uppercase tracking-wider font-bold">
                        {t('calendar.receipt_unit_rate')}
                      </th>
                      <th className="py-2.5 px-3 text-right uppercase tracking-wider font-bold">
                        {t('calendar.receipt_total')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#EBE6DD]">
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#1C1B18]">{receipt.property_name}</div>
                        <div className="text-[11px] text-[#78716C]">
                          {formatDate(receipt.check_in)} &rarr; {formatDate(receipt.check_out)}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-medium">
                        {receipt.nights}{' '}
                        {receipt.nights > 1 ? t('calendar.receipt_nights') : t('calendar.receipt_night')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {formatMoney(receipt.unit_nightly_rate, receipt.currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#1C1B18]">
                        {formatMoney(receipt.total_amount, receipt.currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals Breakdown */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-80 space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#78716C]">{t('calendar.payment_status')}:</span>
                    <span
                      data-testid="receipt-payment-status"
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                        paymentStatusBadgeClasses[receipt.payment_status || 'unpaid']
                      }`}
                    >
                      {paymentStatusLabels[receipt.payment_status || 'unpaid'] || receipt.payment_status}
                    </span>
                  </div>

                  {receipt.payment_method && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[#78716C]">{t('calendar.payment_method')}:</span>
                      <span className="font-semibold text-[#1C1B18]">
                        {methodLabels[receipt.payment_method] || receipt.payment_method}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t-2 border-[#0F3D5E] pt-2 text-sm font-extrabold text-[#0F3D5E]">
                    <span>{t('calendar.receipt_total')}:</span>
                    <span data-testid="receipt-total-amount">
                      {formatMoney(receipt.total_amount, receipt.currency)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 font-semibold text-emerald-800">
                    <span>{t('calendar.receipt_paid')}:</span>
                    <span data-testid="receipt-paid-amount">
                      {formatMoney(receipt.paid_amount, receipt.currency)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-t border-dashed border-[#EBE6DD] pt-2 font-bold text-[#D96B43]">
                    <span>{t('calendar.receipt_balance')}:</span>
                    <span data-testid="receipt-balance-amount">
                      {formatMoney(receipt.outstanding_balance, receipt.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {receipt.notes && (
                <div className="rounded-lg border-l-4 border-[#D96B43] bg-[#FAF8F5] p-3 text-xs text-[#3B3735]">
                  <span className="font-bold uppercase text-[10px] tracking-wider text-[#78716C] block mb-0.5">
                    Instructions / Notes
                  </span>
                  {receipt.notes}
                </div>
              )}

              {/* Legal Footer & Stamp */}
              <div className="flex flex-wrap items-end justify-between gap-4 border-t border-[#EBE6DD] pt-4 text-[11px] text-[#78716C]">
                <div className="max-w-xs space-y-1">
                  <p>{t('calendar.receipt_legal')}</p>
                  <p className="text-[10px] text-[#A8A29E]">
                    Vayca Operations &bull; {receipt.invoice_number}
                  </p>
                </div>
                <div className="flex h-20 w-44 items-center justify-center rounded-lg border border-dashed border-[#B6DAEA] bg-[#FAF8F5] p-2 text-center text-[10px] uppercase tracking-wider text-[#78716C]">
                  {t('calendar.receipt_stamp')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
