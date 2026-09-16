import { useCallback, useEffect, useState } from 'react';
import { 
  Building2, 
  Calendar, 
  Download, 
  Eye, 
  FileSpreadsheet, 
  Loader2, 
  AlertCircle, 
  X, 
  UserCheck, 
  Wrench,
  TrendingUp,
  CreditCard,
  RefreshCw,
  Printer,
  Mail,
  Share2,
  Check
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { 
  fetchCompanyStatements, 
  getExportStatementUrl, 
  getPrintStatementUrl,
  sendOwnerStatementEmail,
  getOwnerStatementShareLink,
  type CompanyStatementsOverview, 
  type OwnerMonthlyStatement 
} from '../api/owners';


interface OwnerStatementsViewProps {
  defaultCurrency?: string;
}

function formatMoney(amount: number | string | null | undefined, currency: string): string {
  const num = Number(amount ?? 0);
  return `${num.toFixed(3)} ${currency}`;
}

export function OwnerStatementsView({ defaultCurrency = 'TND' }: OwnerStatementsViewProps) {
  const { t } = useI18n();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [overview, setOverview] = useState<CompanyStatementsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatement, setActiveStatement] = useState<OwnerMonthlyStatement | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const loadStatements = useCallback(async (year: number, month: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCompanyStatements(year, month);
      setOverview(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load monthly payout statements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatements(selectedYear, selectedMonth);
  }, [loadStatements, selectedYear, selectedMonth]);

  const currency = overview?.currency || defaultCurrency;

  const months = [
    { value: 1, label: t('statements.month_1') },
    { value: 2, label: t('statements.month_2') },
    { value: 3, label: t('statements.month_3') },
    { value: 4, label: t('statements.month_4') },
    { value: 5, label: t('statements.month_5') },
    { value: 6, label: t('statements.month_6') },
    { value: 7, label: t('statements.month_7') },
    { value: 8, label: t('statements.month_8') },
    { value: 9, label: t('statements.month_9') },
    { value: 10, label: t('statements.month_10') },
    { value: 11, label: t('statements.month_11') },
    { value: 12, label: t('statements.month_12') },
  ];

  const currentYear = currentDate.getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const handleExportCsv = (ownerId: string) => {
    const url = getExportStatementUrl(ownerId, selectedYear, selectedMonth);
    window.open(url, '_blank');
  };

  const handlePrint = (ownerId: string) => {
    const url = getPrintStatementUrl(ownerId, selectedYear, selectedMonth);
    window.open(url, '_blank');
  };

  const handleSendEmail = async (stmt: OwnerMonthlyStatement) => {
    try {
      setSendingEmail(true);
      setEmailSuccessMsg(null);
      setEmailErrorMsg(null);
      const res = await sendOwnerStatementEmail({
        owner_id: stmt.owner_id,
        year: stmt.year,
        month: stmt.month,
      });
      setEmailSuccessMsg(t('statements.email_sent_success', { email: res.sent_to_email }));
      setTimeout(() => setEmailSuccessMsg(null), 5000);
    } catch (err: any) {
      setEmailErrorMsg(err.message || t('statements.email_sent_error'));
      setTimeout(() => setEmailErrorMsg(null), 5000);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCopyShareLink = async (stmt: OwnerMonthlyStatement) => {
    try {
      const res = await getOwnerStatementShareLink({
        owner_id: stmt.owner_id,
        year: stmt.year,
        month: stmt.month,
      });
      await navigator.clipboard.writeText(res.portal_url);
      setCopiedLinkId(stmt.owner_id);
      setTimeout(() => setCopiedLinkId(null), 3000);
    } catch (err) {
      console.error('Failed to copy share link:', err);
    }
  };


  return (
    <div className="space-y-6">
      {/* Period Selection and Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#EBE6DD] shadow-sm">
        <div>
          <h2 className="text-base font-bold text-[#1C1B18]">{t('statements.title')}</h2>
          <p className="text-xs text-[#78716C]">{t('statements.subtitle')}</p>
        </div>

        {/* Month & Year Selectors */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#FAF8F5] border border-[#EBE6DD] rounded-lg px-2.5 py-1 text-xs">
            <Calendar className="h-3.5 w-3.5 text-[#0F3D5E]" />
            <select
              aria-label="Filter by month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent font-bold text-[#1C1B18] focus:outline-none cursor-pointer"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-bold text-[#1C1B18] focus:outline-none cursor-pointer border-l border-[#EBE6DD] pl-2 ml-1"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            aria-label="Refresh statements"
            onClick={() => void loadStatements(selectedYear, selectedMonth)}
            disabled={loading}
            className="p-1.5 rounded-lg border border-[#EBE6DD] bg-white text-[#0F3D5E] hover:bg-[#F0F6FA] cursor-pointer disabled:opacity-50"
            title={t('common.refresh')}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {emailSuccessMsg && (
        <div role="status" className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{emailSuccessMsg}</span>
          </div>
          <button type="button" onClick={() => setEmailSuccessMsg(null)} className="p-1 text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {emailErrorMsg && (
        <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{emailErrorMsg}</span>
          </div>
          <button type="button" onClick={() => setEmailErrorMsg(null)} className="p-1 text-rose-700 hover:text-rose-900 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (

        <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadStatements(selectedYear, selectedMonth)}
            className="font-bold underline text-rose-900 cursor-pointer"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {loading ? (
        <div role="status" className="rounded-xl border border-[#EBE6DD] bg-white p-12 flex items-center justify-center gap-2 text-xs text-[#78716C] shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[#0F3D5E]" />
          <span>{t('common.loading')}</span>
        </div>
      ) : overview ? (
        <>
          {/* Truthful Financial Summary KPI Strip */}
          <section className="bg-white border border-[#EBE6DD] rounded-xl p-4 shadow-sm grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-2 border-r border-[#EBE6DD] last:border-r-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] block flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-[#0F3D5E]" />
                {t('statements.gross_revenue')}
              </span>
              <span className="text-xl font-extrabold text-[#1C1B18] mt-1 block">
                {formatMoney(overview.total_gross_revenue, currency)}
              </span>
            </div>

            <div className="p-2 border-r border-[#EBE6DD] last:border-r-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] block flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5 text-[#D96B43]" />
                {t('statements.agency_commission')}
              </span>
              <span className="text-xl font-extrabold text-[#D96B43] mt-1 block">
                {formatMoney(overview.total_commission, currency)}
              </span>
            </div>

            <div className="p-2 border-r border-[#EBE6DD] last:border-r-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] block flex items-center gap-1">
                <Wrench className="h-3.5 w-3.5 text-amber-700" />
                {t('statements.maintenance_expenses')}
              </span>
              <span className="text-xl font-extrabold text-amber-900 mt-1 block">
                {formatMoney(overview.total_maintenance_expenses, currency)}
              </span>
            </div>

            <div className="p-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] block flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                {t('statements.net_payout')}
              </span>
              <span className="text-xl font-extrabold text-emerald-700 mt-1 block">
                {formatMoney(overview.total_net_payout, currency)}
              </span>
            </div>
          </section>

          {/* Statements Table */}
          {overview.statements.length === 0 ? (
            <div className="rounded-xl border border-[#EBE6DD] bg-white p-12 text-center space-y-3 shadow-sm">
              <FileSpreadsheet className="mx-auto h-8 w-8 text-[#78716C]" />
              <p className="text-xs text-[#78716C]">{t('statements.empty_owners')}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#EBE6DD] bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#EBE6DD] bg-[#FAF8F5] text-[11px] font-bold uppercase tracking-wider text-[#78716C]">
                    <tr>
                      <th className="px-4 py-3">{t('statements.owner_header')}</th>
                      <th className="px-4 py-3 text-right">{t('statements.commission_rate_header')}</th>
                      <th className="px-4 py-3 text-center">{t('statements.properties_header')}</th>
                      <th className="px-4 py-3 text-right">{t('statements.gross_revenue')}</th>
                      <th className="px-4 py-3 text-right">{t('statements.agency_commission')}</th>
                      <th className="px-4 py-3 text-right">{t('statements.maintenance_expenses')}</th>
                      <th className="px-4 py-3 text-right font-extrabold">{t('statements.net_due_header')}</th>
                      <th className="px-4 py-3 text-right">{t('statements.actions_header')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBE6DD]">
                    {overview.statements.map((stmt) => (
                      <tr key={stmt.owner_id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-[#1C1B18]">{stmt.owner_name}</div>
                          {stmt.email && <div className="text-[11px] text-[#78716C]">{stmt.email}</div>}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-[#0F3D5E]">
                          {Number(stmt.commission_percentage).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold text-[#1C1B18]">
                          {stmt.properties_count}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-[#1C1B18]">
                          {formatMoney(stmt.gross_revenue, currency)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-[#D96B43]">
                          {formatMoney(stmt.commission_amount, currency)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-amber-900">
                          {formatMoney(stmt.maintenance_expenses, currency)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-extrabold text-emerald-700 text-sm">
                          {formatMoney(stmt.net_payout, currency)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActiveStatement(stmt)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#EBE6DD] bg-white text-xs font-semibold text-[#0F3D5E] hover:bg-[#F0F6FA] transition-colors cursor-pointer"
                            >
                              <Eye className="h-3 w-3" />
                              <span>{t('statements.view_details')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrint(stmt.owner_id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#EBE6DD] bg-white text-xs font-semibold text-[#78716C] hover:text-[#0F3D5E] hover:bg-[#F0F6FA] transition-colors cursor-pointer"
                              title={t('statements.print_html')}
                            >
                              <Printer className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              disabled={sendingEmail || !stmt.email}
                              onClick={() => void handleSendEmail(stmt)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#EBE6DD] bg-white text-xs font-semibold text-[#78716C] hover:text-[#0F3D5E] hover:bg-[#F0F6FA] disabled:opacity-40 transition-colors cursor-pointer"
                              title={!stmt.email ? t('statements.no_email_tooltip') : t('statements.send_email')}
                            >
                              <Mail className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleCopyShareLink(stmt)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#EBE6DD] bg-white text-xs font-semibold text-[#78716C] hover:text-[#0F3D5E] hover:bg-[#F0F6FA] transition-colors cursor-pointer"
                              title={copiedLinkId === stmt.owner_id ? t('statements.link_copied') : t('statements.share_link')}
                            >
                              {copiedLinkId === stmt.owner_id ? <Check className="h-3 w-3 text-emerald-600" /> : <Share2 className="h-3 w-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportCsv(stmt.owner_id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#EBE6DD] bg-white text-xs font-semibold text-[#78716C] hover:text-[#0F3D5E] hover:bg-[#F0F6FA] transition-colors cursor-pointer"
                              title={t('statements.export_csv')}
                            >
                              <Download className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Itemized Single Owner Statement Modal */}
      {activeStatement && (
        <div className="fixed inset-0 z-50 bg-[#1C1B18]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EBE6DD] max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#EBE6DD] flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-base text-[#1C1B18] flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#0F3D5E]" />
                  {t('statements.owner_details', { name: activeStatement.owner_name })}
                </h3>
                <p className="text-xs text-[#78716C] mt-0.5">
                  {months.find((m) => m.value === activeStatement.month)?.label} {activeStatement.year} · {activeStatement.commission_percentage}% {t('properties.commission_rate')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrint(activeStatement.owner_id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#EBE6DD] bg-white text-[#3B3735] text-xs font-bold hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5 text-[#0F3D5E]" />
                  <span>{t('statements.print_html')}</span>
                </button>
                <button
                  type="button"
                  disabled={sendingEmail || !activeStatement.email}
                  onClick={() => void handleSendEmail(activeStatement)}
                  title={!activeStatement.email ? t('statements.no_email_tooltip') : undefined}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#EBE6DD] bg-white text-[#3B3735] text-xs font-bold hover:bg-[#FAF8F5] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {sendingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5 text-[#0F3D5E]" />}
                  <span>{sendingEmail ? t('statements.sending_email') : t('statements.send_email')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopyShareLink(activeStatement)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#EBE6DD] bg-white text-[#3B3735] text-xs font-bold hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  {copiedLinkId === activeStatement.owner_id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5 text-[#0F3D5E]" />}
                  <span>{copiedLinkId === activeStatement.owner_id ? t('statements.link_copied') : t('statements.share_link')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportCsv(activeStatement.owner_id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0F3D5E] text-white text-xs font-bold shadow-sm hover:bg-[#0C324E] transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{t('statements.export_csv')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStatement(null)}
                  className="p-1.5 rounded-lg text-[#78716C] hover:text-[#1C1B18] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>


            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {/* Owner Payout KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD]">
                  <span className="text-[10px] font-bold uppercase text-[#78716C] block">{t('statements.gross_revenue')}</span>
                  <span className="text-base font-extrabold text-[#1C1B18] block mt-1">
                    {formatMoney(activeStatement.gross_revenue, currency)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD]">
                  <span className="text-[10px] font-bold uppercase text-[#78716C] block">{t('statements.agency_commission')}</span>
                  <span className="text-base font-extrabold text-[#D96B43] block mt-1">
                    {formatMoney(activeStatement.commission_amount, currency)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD]">
                  <span className="text-[10px] font-bold uppercase text-[#78716C] block">{t('statements.maintenance_expenses')}</span>
                  <span className="text-base font-extrabold text-amber-900 block mt-1">
                    {formatMoney(activeStatement.maintenance_expenses, currency)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">{t('statements.net_payout')}</span>
                  <span className="text-base font-extrabold text-emerald-700 block mt-1">
                    {formatMoney(activeStatement.net_payout, currency)}
                  </span>
                </div>
              </div>

              {/* Properties Breakdown */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#3B3735] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#0F3D5E]" />
                  <span>{t('statements.properties_header')}</span>
                </h4>
                <div className="overflow-hidden rounded-xl border border-[#EBE6DD]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F5] border-b border-[#EBE6DD] text-[10px] font-bold uppercase text-[#78716C]">
                      <tr>
                        <th className="px-3 py-2">Propriété</th>
                        <th className="px-3 py-2 text-center">Séjours</th>
                        <th className="px-3 py-2 text-right">Revenu brut</th>
                        <th className="px-3 py-2 text-right">Commission</th>
                        <th className="px-3 py-2 text-right">Maintenance</th>
                        <th className="px-3 py-2 text-right">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EBE6DD]">
                      {activeStatement.properties.map((p) => (
                        <tr key={p.property_id}>
                          <td className="px-3 py-2 font-bold text-[#1C1B18]">{p.property_name}</td>
                          <td className="px-3 py-2 text-center">{p.bookings_count}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatMoney(p.gross_revenue, currency)}</td>
                          <td className="px-3 py-2 text-right font-mono text-[#D96B43]">{formatMoney(p.commission_amount, currency)}</td>
                          <td className="px-3 py-2 text-right font-mono text-amber-900">{formatMoney(p.maintenance_expenses, currency)}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">{formatMoney(p.net_payout, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Completed Bookings Breakdown */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#3B3735]">
                  {t('statements.bookings_breakdown', { count: activeStatement.bookings.length })}
                </h4>
                {activeStatement.bookings.length === 0 ? (
                  <p className="text-xs text-[#78716C] italic p-3 rounded-lg bg-[#FAF8F5] border border-[#EBE6DD]">
                    {t('statements.no_bookings')}
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-[#EBE6DD]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF8F5] border-b border-[#EBE6DD] text-[10px] font-bold uppercase text-[#78716C]">
                        <tr>
                          <th className="px-3 py-2">{t('statements.guest')}</th>
                          <th className="px-3 py-2">Propriété</th>
                          <th className="px-3 py-2">{t('statements.dates')}</th>
                          <th className="px-3 py-2">{t('statements.channel')}</th>
                          <th className="px-3 py-2 text-right">{t('statements.amount')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EBE6DD]">
                        {activeStatement.bookings.map((b) => (
                          <tr key={b.booking_id}>
                            <td className="px-3 py-2 font-semibold text-[#1C1B18]">{b.guest_name || 'Voyageur'}</td>
                            <td className="px-3 py-2 text-[#78716C]">{b.property_name}</td>
                            <td className="px-3 py-2 font-mono text-[11px] text-[#78716C]">
                              {b.check_in.slice(0, 10)} &rarr; {b.check_out.slice(0, 10)}
                            </td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#F0F6FA] text-[#0F3D5E] border border-[#B6DAEA]">
                                {b.source_type}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-[#1C1B18]">
                              {formatMoney(b.total_amount, currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Maintenance Deductions Breakdown */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#3B3735] flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-700" />
                  <span>{t('statements.tickets_breakdown', { count: activeStatement.maintenance_tickets.length })}</span>
                </h4>
                {activeStatement.maintenance_tickets.length === 0 ? (
                  <p className="text-xs text-[#78716C] italic p-3 rounded-lg bg-[#FAF8F5] border border-[#EBE6DD]">
                    {t('statements.no_tickets')}
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-[#EBE6DD]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF8F5] border-b border-[#EBE6DD] text-[10px] font-bold uppercase text-[#78716C]">
                        <tr>
                          <th className="px-3 py-2">{t('statements.ticket_title')}</th>
                          <th className="px-3 py-2">Propriété</th>
                          <th className="px-3 py-2">{t('statements.resolved_date')}</th>
                          <th className="px-3 py-2 text-right">{t('statements.ticket_cost')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EBE6DD]">
                        {activeStatement.maintenance_tickets.map((tkt) => (
                          <tr key={tkt.ticket_id}>
                            <td className="px-3 py-2 font-semibold text-[#1C1B18]">{tkt.title}</td>
                            <td className="px-3 py-2 text-[#78716C]">{tkt.property_name}</td>
                            <td className="px-3 py-2 font-mono text-[11px] text-[#78716C]">
                              {tkt.resolved_at ? tkt.resolved_at.slice(0, 10) : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-amber-900">
                              {formatMoney(tkt.cost, currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#EBE6DD] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setActiveStatement(null)}
                className="px-4 py-2 rounded-xl border border-[#EBE6DD] font-semibold text-[#78716C] hover:bg-[#FAF8F5] cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
