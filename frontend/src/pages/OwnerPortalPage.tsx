import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  AlertCircle,
  Building2,
  Calendar,
  CreditCard,
  Download,
  Globe,
  Loader2,
  Printer,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import {
  fetchPublicOwnerStatement,
  getPublicExportStatementUrl,
  getPublicPrintStatementUrl,
  type OwnerMonthlyStatement,
} from '../api/owners';
import { useI18n } from '../i18n/I18nContext';

function formatMoney(amount: number | string | null | undefined, currency: string): string {
  const num = Number(amount ?? 0);
  return `${num.toFixed(3)} ${currency}`;
}

export function OwnerPortalPage() {
  const { t, locale, setLocale } = useI18n();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [statement, setStatement] = useState<OwnerMonthlyStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'tickets'>('overview');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError(t('statements.portal_invalid_token'));
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPublicOwnerStatement(token);
        setStatement(data);
      } catch (err: any) {
        setError(err.message || t('statements.portal_invalid_token'));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token, t]);

  const months = [
    '',
    t('statements.month_1'),
    t('statements.month_2'),
    t('statements.month_3'),
    t('statements.month_4'),
    t('statements.month_5'),
    t('statements.month_6'),
    t('statements.month_7'),
    t('statements.month_8'),
    t('statements.month_9'),
    t('statements.month_10'),
    t('statements.month_11'),
    t('statements.month_12'),
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-[#0F3D5E] animate-spin mb-3" />
        <p className="text-sm font-semibold text-[#78716C]">Chargement de votre relevé...</p>
      </div>
    );
  }

  if (error || !statement) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#EBE6DD] p-8 text-center shadow-lg">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#1C1B18] mb-2">{error || t('statements.portal_invalid_token')}</h2>
          <p className="text-xs text-[#78716C] mb-6">{t('statements.portal_invalid_token_help')}</p>
          <div className="text-[11px] text-[#A8A29E]">Plateforme Vayca &bull; Sécurité & Confidentialité</div>
        </div>
      </div>
    );
  }

  const periodLabel = `${months[statement.month] || statement.month} ${statement.year}`;
  const currency = statement.currency || 'TND';

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1B18] pb-16">
      {/* Top Bar with Language Toggle */}
      <header className="bg-white border-b border-[#EBE6DD] sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0F3D5E] flex items-center justify-center text-white font-extrabold text-sm">
            V
          </div>
          <div>
            <span className="font-extrabold text-[#0F3D5E] tracking-tight text-base block leading-tight">Vayca</span>
            <span className="text-[10px] font-semibold text-[#78716C] uppercase tracking-wider block">
              {t('statements.portal_title')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className="flex items-center gap-1 bg-[#FAF8F5] border border-[#EBE6DD] rounded-lg p-1 text-xs font-bold">
            <Globe className="w-3.5 h-3.5 text-[#78716C] ml-1" />
            <button
              type="button"
              onClick={() => setLocale('fr')}
              className={`px-2 py-0.5 rounded cursor-pointer ${locale === 'fr' ? 'bg-[#0F3D5E] text-white' : 'text-[#78716C] hover:text-[#1C1B18]'}`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={`px-2 py-0.5 rounded cursor-pointer ${locale === 'en' ? 'bg-[#0F3D5E] text-white' : 'text-[#78716C] hover:text-[#1C1B18]'}`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 pt-8 space-y-6">
        {/* Statement Hero Card */}
        <div className="bg-white rounded-2xl border border-[#EBE6DD] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0F6FA] text-[#0F3D5E] text-xs font-extrabold tracking-wide">
              <Calendar className="w-3.5 h-3.5" />
              <span>{periodLabel}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#1C1B18] tracking-tight">
              {statement.owner_name}
            </h1>
            <p className="text-xs text-[#78716C] flex flex-wrap items-center gap-3">
              <span>{statement.properties_count} {t('statements.properties_count', { count: statement.properties_count })}</span>
              <span>&bull;</span>
              <span>{statement.bookings_count} {t('statements.bookings_count', { count: statement.bookings_count })}</span>
              <span>&bull;</span>
              <span>{statement.commission_percentage}% {t('statements.commission_rate_header')}</span>
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href={token ? getPublicPrintStatementUrl(token) : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#EBE6DD] bg-white text-xs font-bold text-[#1C1B18] shadow-xs hover:bg-[#FAF8F5] transition-colors"
            >
              <Printer className="w-4 h-4 text-[#0F3D5E]" />
              <span>{t('statements.portal_print')}</span>
            </a>
            <a
              href={token ? getPublicExportStatementUrl(token) : '#'}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F3D5E] text-white text-xs font-bold shadow-xs hover:bg-[#0C324E] transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{t('statements.portal_export_csv')}</span>
            </a>
          </div>
        </div>

        {/* 4 Financial KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-[#EBE6DD] p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#78716C] mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t('statements.gross_revenue')}</span>
              <TrendingUp className="w-4 h-4 text-[#0F3D5E]" />
            </div>
            <div className="text-xl font-extrabold text-[#1C1B18] font-mono">
              {formatMoney(statement.gross_revenue, currency)}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#EBE6DD] p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#78716C] mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t('statements.agency_commission')}</span>
              <span className="text-[10px] font-bold text-[#D96B43] bg-orange-50 px-1.5 py-0.5 rounded">
                {Number(statement.commission_percentage).toFixed(0)}%
              </span>
            </div>
            <div className="text-xl font-extrabold text-[#D96B43] font-mono">
              -{formatMoney(statement.commission_amount, currency)}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#EBE6DD] p-4 shadow-xs">
            <div className="flex items-center justify-between text-[#78716C] mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t('statements.maintenance_expenses')}</span>
              <Wrench className="w-4 h-4 text-amber-900" />
            </div>
            <div className="text-xl font-extrabold text-amber-900 font-mono">
              -{formatMoney(statement.maintenance_expenses, currency)}
            </div>
          </div>

          <div className="bg-emerald-50/70 rounded-xl border border-emerald-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-emerald-800 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t('statements.net_payout')}</span>
              <CreditCard className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-xl font-extrabold text-emerald-700 font-mono">
              {formatMoney(statement.net_payout, currency)}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-[#EBE6DD] flex items-center gap-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'overview'
                ? 'border-[#0F3D5E] text-[#0F3D5E]'
                : 'border-transparent text-[#78716C] hover:text-[#1C1B18]'
            }`}
          >
            {t('statements.portal_all_properties')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`pb-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'bookings'
                ? 'border-[#0F3D5E] text-[#0F3D5E]'
                : 'border-transparent text-[#78716C] hover:text-[#1C1B18]'
            }`}
          >
            <span>{t('statements.portal_bookings_tab')}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#FAF8F5] border border-[#EBE6DD] text-[10px] text-[#78716C]">
              {statement.bookings.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`pb-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'tickets'
                ? 'border-[#0F3D5E] text-[#0F3D5E]'
                : 'border-transparent text-[#78716C] hover:text-[#1C1B18]'
            }`}
          >
            <span>{t('statements.portal_tickets_tab')}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#FAF8F5] border border-[#EBE6DD] text-[10px] text-[#78716C]">
              {statement.maintenance_tickets.length}
            </span>
          </button>
        </div>

        {/* Tab Content: Properties Overview */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-2xl border border-[#EBE6DD] overflow-hidden shadow-xs">
            <div className="p-4 bg-[#FAF8F5] border-b border-[#EBE6DD] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0F3D5E]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#3B3735]">
                {t('statements.properties_header')} ({statement.properties.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5]/60 border-b border-[#EBE6DD] text-[10px] font-bold uppercase text-[#78716C]">
                  <tr>
                    <th className="px-4 py-3">{t('properties.name')}</th>
                    <th className="px-4 py-3 text-center">{t('statements.bookings_count', { count: '' }).trim()}</th>
                    <th className="px-4 py-3 text-right">{t('statements.gross_revenue')}</th>
                    <th className="px-4 py-3 text-right">{t('statements.agency_commission')}</th>
                    <th className="px-4 py-3 text-right">{t('statements.maintenance_expenses')}</th>
                    <th className="px-4 py-3 text-right font-bold text-[#0F3D5E]">{t('statements.net_payout')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBE6DD]">
                  {statement.properties.map((p) => (
                    <tr key={p.property_id} className="hover:bg-[#FAF8F5]/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-[#1C1B18]">{p.property_name}</td>
                      <td className="px-4 py-3 text-center">{p.bookings_count}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(p.gross_revenue, currency)}</td>
                      <td className="px-4 py-3 text-right font-mono text-[#D96B43]">
                        -{formatMoney(p.commission_amount, currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-900">
                        -{formatMoney(p.maintenance_expenses, currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                        {formatMoney(p.net_payout, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Completed Bookings */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-2xl border border-[#EBE6DD] overflow-hidden shadow-xs">
            <div className="p-4 bg-[#FAF8F5] border-b border-[#EBE6DD]">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#3B3735]">
                {t('statements.bookings_breakdown', { count: statement.bookings.length })}
              </h3>
            </div>
            {statement.bookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#78716C]">{t('statements.no_bookings')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5]/60 border-b border-[#EBE6DD] text-[10px] font-bold uppercase text-[#78716C]">
                    <tr>
                      <th className="px-4 py-3">Propriété</th>
                      <th className="px-4 py-3">Voyageur</th>
                      <th className="px-4 py-3">Dates</th>
                      <th className="px-4 py-3 text-center">Canal</th>
                      <th className="px-4 py-3 text-right font-bold text-[#0F3D5E]">Revenu Brut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBE6DD]">
                    {statement.bookings.map((b) => (
                      <tr key={b.booking_id} className="hover:bg-[#FAF8F5]/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-[#1C1B18]">{b.property_name}</td>
                        <td className="px-4 py-3 text-[#3B3735]">{b.guest_name || 'Voyageur'}</td>
                        <td className="px-4 py-3 text-[#78716C] font-mono text-[11px]">
                          {b.check_in.slice(0, 10)} &rarr; {b.check_out.slice(0, 10)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#F0F6FA] text-[#0F3D5E]">
                            {b.source_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-[#1C1B18]">
                          {formatMoney(b.total_amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Deductible Maintenance Tickets */}
        {activeTab === 'tickets' && (
          <div className="bg-white rounded-2xl border border-[#EBE6DD] overflow-hidden shadow-xs">
            <div className="p-4 bg-[#FAF8F5] border-b border-[#EBE6DD]">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#3B3735]">
                {t('statements.tickets_breakdown', { count: statement.maintenance_tickets.length })}
              </h3>
            </div>
            {statement.maintenance_tickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#78716C]">{t('statements.no_tickets')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5]/60 border-b border-[#EBE6DD] text-[10px] font-bold uppercase text-[#78716C]">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Propriété</th>
                      <th className="px-4 py-3">Intervention</th>
                      <th className="px-4 py-3 text-center">Catégorie</th>
                      <th className="px-4 py-3 text-right font-bold text-amber-900">Coût Déductible</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBE6DD]">
                    {statement.maintenance_tickets.map((tItem) => (
                      <tr key={tItem.ticket_id} className="hover:bg-[#FAF8F5]/50 transition-colors">
                        <td className="px-4 py-3 text-[#78716C] font-mono text-[11px]">
                          {tItem.resolved_at ? tItem.resolved_at.slice(0, 10) : '-'}
                        </td>
                        <td className="px-4 py-3 font-bold text-[#1C1B18]">{tItem.property_name}</td>
                        <td className="px-4 py-3 text-[#3B3735]">{tItem.title}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-900">
                            {tItem.category || 'Général'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-amber-900">
                          -{formatMoney(tItem.cost, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="pt-8 border-t border-[#EBE6DD] text-center text-xs text-[#78716C] space-y-1">
          <p>{t('statements.portal_subtitle')}</p>
          <p className="text-[11px] text-[#A8A29E]">&copy; Vayca Operations. Tous droits réservés.</p>
        </footer>
      </main>
    </div>
  );
}
export default OwnerPortalPage;
