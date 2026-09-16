import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  CircleDot,
  Clock3,
  FlaskConical,
  Globe,
  LoaderCircle,
  RefreshCw,
  Users,
  WifiOff,
  XCircle,
  Languages,
  Check,
  UserCheck,
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { ApiError } from '../auth/api';
import { useAuth } from '../auth/useAuth';
import {
  configureCalendarFeed,
  fetchCalendarFeeds,
  requestCalendarFeedSync,
  type CalendarFeedChannelType,
  type CalendarFeedHealth,
  type FeedHealthStatus,
} from '../api/calendar';
import { fetchAllActiveProperties, type ApiProperty } from '../api/properties';
import {
  fetchWhatsappIntegrationHealth,
  type WhatsappHealthStatus,
  type WhatsappIntegrationHealth,
} from '../api/integrations';
import { TeamManagementPanel } from '../components/TeamManagementPanel';
import { OwnersManagementPanel } from '../components/OwnersManagementPanel';
import { PricingManagementPanel } from '../components/PricingManagementPanel';
import { WorkstationHeader } from '../components/WorkstationHeader';

const feedProviders: Array<{ value: CalendarFeedChannelType; label: string }> = [
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'booking_com', label: 'Booking.com' },
  { value: 'vrbo', label: 'Vrbo' },
  { value: 'expedia', label: 'Expedia' },
  { value: 'other', label: 'Other iCalendar' },
];

export function SettingsPage() {
  const { identity } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const [activeTab, setActiveTab] = useState<'team' | 'company' | 'owners' | 'channels' | 'preferences'>('team');

  if (!identity || identity.user.role !== 'manager') return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF8F5]">
      <WorkstationHeader
        section={t('nav.settings')}
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        actions={
          <span className="rounded-lg border border-[#B6DAEA] bg-[#F0F6FA] px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#0F3D5E]">
            {t('settings.admin_tag')}
          </span>
        }
      />
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        <div className="flex gap-2 overflow-x-auto border-b border-[#EBE6DD]">
          <Tab active={activeTab === 'team'} onClick={() => setActiveTab('team')}>
            <Users className="h-4 w-4" /> {t('settings.tab_team')}
          </Tab>
          <Tab active={activeTab === 'company'} onClick={() => setActiveTab('company')}>
            <Building className="h-4 w-4" /> {t('settings.tab_company')}
          </Tab>
          <Tab active={activeTab === 'owners'} onClick={() => setActiveTab('owners')}>
            <UserCheck className="h-4 w-4" /> {t('settings.tab_owners')}
          </Tab>
          <Tab active={activeTab === 'preferences'} onClick={() => setActiveTab('preferences')}>
            <Languages className="h-4 w-4" /> {t('settings.tab_preferences')}
          </Tab>
          <Tab active={activeTab === 'channels'} onClick={() => setActiveTab('channels')}>
            <Globe className="h-4 w-4" /> {t('settings.tab_channels')}
          </Tab>
        </div>
        {activeTab === 'team' && <TeamManagementPanel />}
        {activeTab === 'company' && (
          <div className="space-y-6">
            <div className="max-w-2xl space-y-4 rounded-2xl border border-[#EBE6DD] bg-white p-6 shadow-sm">
              <div>
                <div className="text-xs font-semibold text-[#78716C]">{t('settings.company.name_label')}</div>
                <div className="mt-1 font-bold text-[#1C1B18]">{identity.company.name}</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold text-[#78716C]">{t('settings.company.timezone_label')}</div>
                  <div className="mt-1 text-sm">{identity.company.timezone}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#78716C]">{t('settings.company.currency_label')}</div>
                  <div className="mt-1 text-sm">{identity.company.default_currency}</div>
                </div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                {t('settings.company.notice')}
              </div>
            </div>
            <LanguagePreferencesCard locale={locale} setLocale={setLocale} t={t} />
          </div>
        )}
        {activeTab === 'owners' && <OwnersManagementPanel />}
        {activeTab === 'preferences' && (
          <LanguagePreferencesCard locale={locale} setLocale={setLocale} t={t} />
        )}
        {activeTab === 'channels' && <><IntegrationsPanel companyTimezone={identity.company.timezone} /><PricingManagementPanel /></>}
      </div>
    </div>
  );
}

function LanguagePreferencesCard({
  locale,
  setLocale,
  t
}: {
  locale: string;
  setLocale: (loc: 'fr' | 'en') => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const { preferenceError, clearPreferenceError } = useAuth();
  return (
    <section aria-label="Language Preferences" className="max-w-2xl rounded-2xl border border-[#EBE6DD] bg-white p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-[#EBE6DD]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F6FA] text-[#0F3D5E]">
            <Languages className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1C1B18]">{t('settings.language_title')}</h2>
            <p className="text-xs text-[#78716C] mt-0.5">{t('settings.language_desc')}</p>
          </div>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F3D5E] bg-[#F0F6FA] px-2.5 py-1 rounded-full border border-[#B6DAEA]">
          {locale === 'fr' ? 'FR' : 'EN'}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* French Option (Primary) */}
        <button
          type="button"
          onClick={() => setLocale('fr')}
          aria-label="Sélectionner Français"
          className={`flex flex-col justify-between p-4 rounded-xl border text-left transition-all cursor-pointer ${
            locale === 'fr'
              ? 'border-[#0F3D5E] bg-[#F0F6FA] shadow-xs ring-2 ring-[#0F3D5E]/10'
              : 'border-[#EBE6DD] bg-[#FAF8F5] hover:bg-white hover:border-[#DDD7CC]'
          }`}
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="text-xl">🇹🇳 / 🇫🇷</span>
              <div>
                <span className="font-bold text-sm text-[#1C1B18] block">Français</span>
                <span className="text-[11px] text-[#78716C] block">Langue principale</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#D96B43] text-white">
              Défaut
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#EBE6DD]/80">
            <span className="text-[11px] font-medium text-[#78716C]">
              Interface en français
            </span>
            {locale === 'fr' && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0F3D5E] text-white">
                <Check className="h-3 w-3" />
              </span>
            )}
          </div>
        </button>

        {/* English Option */}
        <button
          type="button"
          onClick={() => setLocale('en')}
          aria-label="Select English"
          className={`flex flex-col justify-between p-4 rounded-xl border text-left transition-all cursor-pointer ${
            locale === 'en'
              ? 'border-[#0F3D5E] bg-[#F0F6FA] shadow-xs ring-2 ring-[#0F3D5E]/10'
              : 'border-[#EBE6DD] bg-[#FAF8F5] hover:bg-white hover:border-[#DDD7CC]'
          }`}
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="text-xl">🇬🇧</span>
              <div>
                <span className="font-bold text-sm text-[#1C1B18] block">English</span>
                <span className="text-[11px] text-[#78716C] block">Secondary language</span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#EBE6DD]/80">
            <span className="text-[11px] font-medium text-[#78716C]">
              English interface
            </span>
            {locale === 'en' && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0F3D5E] text-white">
                <Check className="h-3 w-3" />
              </span>
            )}
          </div>
        </button>
      </div>

      {preferenceError ? (
        <div role="alert" className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{preferenceError}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              clearPreferenceError();
              setLocale(locale === 'fr' ? 'en' : 'fr');
            }}
            className="font-semibold text-red-700 underline hover:text-red-900 cursor-pointer"
          >
            {locale === 'fr' ? 'Réessayer' : 'Retry'}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{t('settings.lang_saved_note')}</span>
        </div>
      )}
    </section>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 pb-3 text-xs font-bold ${active ? 'border-[#0F3D5E] text-[#0F3D5E]' : 'border-transparent text-[#78716C]'}`}>{children}</button>;
}

function IntegrationsPanel({ companyTimezone }: { companyTimezone: string }) {
  const { t } = useI18n();
  const [properties, setProperties] = useState<ApiProperty[]>([]);
  const [feeds, setFeeds] = useState<CalendarFeedHealth[]>([]);
  const [whatsapp, setWhatsapp] = useState<WhatsappIntegrationHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingFeed, setRefreshingFeed] = useState<string | null>(null);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextProperties, nextFeeds, nextWhatsapp] = await Promise.all([
        fetchAllActiveProperties(),
        fetchCalendarFeeds(),
        fetchWhatsappIntegrationHealth(),
      ]);
      setProperties(nextProperties);
      setFeeds(nextFeeds);
      setWhatsapp(nextWhatsapp);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t('settings.channels.load_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const refreshFeed = async (channelId: string) => {
    setRefreshingFeed(channelId);
    setRefreshMessage(null);
    setRefreshError(null);
    try {
      await requestCalendarFeedSync(channelId);
      setRefreshMessage(t('settings.channels.refresh_queued'));
      await load();
    } catch (cause) {
      setRefreshError(cause instanceof ApiError ? cause.message : t('settings.channels.refresh_error'));
    } finally {
      setRefreshingFeed(null);
    }
  };

  if (loading) return <IntegrationSkeleton />;
  if (error) {
    return (
      <div role="alert" className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        <div className="flex items-start gap-3">
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">{t('settings.channels.load_error')}</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
        <button onClick={() => void load()} className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-800">
          {t('settings.channels.retry_btn')}
        </button>
      </div>
    );
  }

  const propertyById = new Map(properties.map((property) => [property.id, property]));
  return (
    <div className="space-y-6">
      {refreshMessage && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">{refreshMessage}</div>}
      {refreshError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{refreshError}</div>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <section className="space-y-4" aria-labelledby="calendar-integrations-heading">
          <div>
            <h2 id="calendar-integrations-heading" className="text-lg font-bold text-[#1C1B18]">
              {t('settings.channels.calendar_heading')}
            </h2>
            <p className="mt-1 text-sm text-[#78716C]">
              {t('settings.channels.calendar_desc')}
            </p>
          </div>
          {properties.length === 0 ? (
            <EmptyState icon={<Building className="h-5 w-5" />} title={t('settings.channels.no_props_title')} detail={t('settings.channels.no_props_desc')} />
          ) : feeds.length === 0 ? (
            <EmptyState icon={<Globe className="h-5 w-5" />} title={t('settings.channels.no_feeds_title')} detail={t('settings.channels.no_feeds_desc')} />
          ) : (
            <div className="space-y-3">
              {feeds.map((feed) => (
                <FeedCard
                  key={feed.id}
                  feed={feed}
                  property={propertyById.get(feed.property_id)}
                  companyTimezone={companyTimezone}
                  refreshing={refreshingFeed === feed.id}
                  onRefresh={() => void refreshFeed(feed.id)}
                />
              ))}
            </div>
          )}
        </section>
        <FeedSetupForm properties={properties} onSaved={load} />
      </div>
      <WhatsappCard health={whatsapp} />
    </div>
  );
}

function FeedSetupForm({ properties, onSaved }: { properties: ApiProperty[]; onSaved: () => Promise<void> }) {
  const { t } = useI18n();
  const [propertyId, setPropertyId] = useState('');
  const [provider, setProvider] = useState<CalendarFeedChannelType>('airbnb');
  const [url, setUrl] = useState('');
  const [externalListingId, setExternalListingId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (properties.length > 0 && !properties.some((property) => property.id === propertyId)) {
      setPropertyId(properties[0].id);
    }
  }, [properties, propertyId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    const trimmedUrl = url.trim();
    if (!propertyId) return setFormError(t('settings.channels.validation_select_property'));
    if (!trimmedUrl) return setFormError(t('settings.channels.validation_enter_url'));
    try {
      const parsed = new URL(trimmedUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported_protocol');
    } catch {
      return setFormError(t('settings.channels.validation_valid_url'));
    }
    setSubmitting(true);
    try {
      await configureCalendarFeed(propertyId, {
        channel_type: provider,
        calendar_url: trimmedUrl,
        external_listing_id: externalListingId.trim() || null,
      });
      setUrl('');
      setExternalListingId('');
      setFormSuccess(t('settings.channels.feed_saved_success'));
      await onSaved();
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : t('settings.channels.feed_save_error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="h-fit space-y-4 rounded-2xl border border-[#EBE6DD] bg-white p-5 shadow-sm" aria-labelledby="feed-setup-heading">
      <div>
        <h2 id="feed-setup-heading" className="text-lg font-bold text-[#1C1B18]">
          {t('settings.channels.setup_title')}
        </h2>
        <p className="mt-1 text-sm text-[#78716C]">
          {t('settings.channels.setup_desc')}
        </p>
      </div>
      {formSuccess && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{formSuccess}</div>}
      {formError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{formError}</div>}
      <label className="block text-xs font-bold text-[#57534E]">
        {t('settings.channels.property_label')}
        <select aria-label={t('settings.channels.select_property')} value={propertyId} onChange={(event) => setPropertyId(event.target.value)} disabled={properties.length === 0 || submitting} className="mt-1 w-full rounded-lg border border-[#D6D0C7] bg-white px-3 py-2 text-sm">
          <option value="">{t('settings.channels.select_property')}</option>
          {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
        </select>
      </label>
      <label className="block text-xs font-bold text-[#57534E]">
        {t('settings.channels.provider')}
        <select aria-label={t('settings.channels.feed_provider_label')} value={provider} onChange={(event) => setProvider(event.target.value as CalendarFeedChannelType)} disabled={submitting} className="mt-1 w-full rounded-lg border border-[#D6D0C7] bg-white px-3 py-2 text-sm">
          {feedProviders.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="block text-xs font-bold text-[#57534E]">
        {t('settings.channels.feed_url')}
        <input aria-label={t('settings.channels.feed_url')} type="url" required value={url} onChange={(event) => setUrl(event.target.value)} disabled={properties.length === 0 || submitting} className="mt-1 w-full rounded-lg border border-[#D6D0C7] px-3 py-2 text-sm" placeholder={t('settings.channels.feed_url_placeholder')} />
      </label>
      <label className="block text-xs font-bold text-[#57534E]">
        {t('settings.channels.external_listing_id')} <span className="font-normal text-[#78716C]">{t('settings.channels.optional')}</span>
        <input aria-label={t('settings.channels.external_listing_id')} value={externalListingId} onChange={(event) => setExternalListingId(event.target.value)} disabled={properties.length === 0 || submitting} className="mt-1 w-full rounded-lg border border-[#D6D0C7] px-3 py-2 text-sm" />
      </label>
      {properties.length === 0 && <p className="text-xs text-[#78716C]">{t('settings.channels.create_property_first')}</p>}
      <button type="submit" disabled={properties.length === 0 || submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F3D5E] px-3 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
        {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {submitting ? t('settings.channels.saving_feed') : t('settings.channels.save_feed')}
      </button>
    </form>
  );
}

function FeedCard({ feed, property, companyTimezone, refreshing, onRefresh }: { feed: CalendarFeedHealth; property?: ApiProperty; companyTimezone: string; refreshing: boolean; onRefresh: () => void }) {
  const { t } = useI18n();
  const provider = feedProviders.find((option) => option.value === feed.channel_type)?.label ?? 'Other iCalendar';
  return (
    <article className="rounded-2xl border border-[#EBE6DD] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-[#1C1B18]">{provider}</p>
          <p className="mt-1 text-xs text-[#78716C]">{property?.name ?? t('settings.channels.property_unavailable')}</p>
        </div>
        <StatusBadge status={feed.health_status} />
      </div>
      <div className="mt-4 grid gap-2 text-xs text-[#57534E] sm:grid-cols-2">
        <Timestamp label={t('settings.channels.last_sync')} value={feed.last_successful_sync_at} timezone={companyTimezone} />
        <Timestamp label={t('settings.channels.last_attempt')} value={feed.last_sync_at} timezone={companyTimezone} />
      </div>
      {feed.last_error_summary && <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-800">{feed.last_error_summary}</p>}
      <button type="button" onClick={onRefresh} disabled={refreshing || !feed.is_active} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#B6DAEA] px-3 py-2 text-xs font-bold text-[#0F3D5E] disabled:cursor-not-allowed disabled:opacity-50">
        {refreshing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        {refreshing ? t('settings.channels.queueing_refresh') : t('settings.channels.refresh_now')}
      </button>
    </article>
  );
}

function WhatsappCard({ health }: { health: WhatsappIntegrationHealth | null }) {
  const { t } = useI18n();
  if (!health) return null;
  const copy: Record<WhatsappHealthStatus, { label: string; icon: ReactNode; className: string }> = {
    simulator: { label: t('settings.channels.whatsapp_simulator'), icon: <FlaskConical className="h-4 w-4" />, className: 'border-amber-200 bg-amber-50 text-amber-800' },
    test: { label: t('settings.channels.whatsapp_test'), icon: <CircleDot className="h-4 w-4" />, className: 'border-blue-200 bg-blue-50 text-blue-900' },
    unconfigured: { label: t('settings.channels.whatsapp_unconfigured'), icon: <WifiOff className="h-4 w-4" />, className: 'border-slate-200 bg-slate-50 text-slate-800' },
    healthy: { label: t('settings.channels.whatsapp_healthy'), icon: <CheckCircle2 className="h-4 w-4" />, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  };
  const state = copy[health.health_status];
  return (
    <section className="rounded-2xl border border-[#EBE6DD] bg-white p-5 shadow-sm" aria-labelledby="whatsapp-integration-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="whatsapp-integration-heading" className="font-bold text-[#1C1B18]">
            {t('settings.channels.whatsapp_heading')}
          </h2>
          <p className="mt-1 text-xs text-[#78716C]">
            {t('settings.channels.whatsapp_desc')}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${state.className}`}>
          {state.icon}{state.label}
        </span>
      </div>
      <p className="mt-4 text-sm text-[#57534E]">{health.detail}</p>
    </section>
  );
}

function StatusBadge({ status }: { status: FeedHealthStatus }) {
  const { t } = useI18n();
  const definitions: Record<FeedHealthStatus, { label: string; icon: ReactNode; className: string }> = {
    pending: { label: t('settings.channels.status_pending'), icon: <Clock3 className="h-3.5 w-3.5" />, className: 'border-slate-200 bg-slate-50 text-slate-700' },
    running: { label: t('settings.channels.status_running'), icon: <LoaderCircle className="h-3.5 w-3.5 animate-spin" />, className: 'border-blue-200 bg-blue-50 text-blue-900' },
    healthy: { label: t('settings.channels.status_healthy'), icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
    stale: { label: t('settings.channels.status_stale'), icon: <AlertTriangle className="h-3.5 w-3.5" />, className: 'border-amber-200 bg-amber-50 text-amber-800' },
    partial: { label: t('settings.channels.status_partial'), icon: <AlertTriangle className="h-3.5 w-3.5" />, className: 'border-amber-200 bg-amber-50 text-amber-800' },
    failed: { label: t('settings.channels.status_failed'), icon: <XCircle className="h-3.5 w-3.5" />, className: 'border-red-200 bg-red-50 text-red-800' },
    inactive: { label: t('settings.channels.status_inactive'), icon: <WifiOff className="h-3.5 w-3.5" />, className: 'border-slate-200 bg-slate-50 text-slate-700' },
  };
  const definition = definitions[status];
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${definition.className}`}>{definition.icon}{definition.label}</span>;
}

function Timestamp({ label, value, timezone }: { label: string; value: string | null; timezone: string }) {
  const { locale, t } = useI18n();
  return (
    <div>
      <span className="font-semibold">{label}: </span>
      {value ? new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(value)) : t('settings.channels.not_yet_recorded')}
    </div>
  );
}

function EmptyState({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return <div className="rounded-2xl border border-dashed border-[#D6D0C7] bg-[#FCFBF8] p-6"><div className="flex items-center gap-2 text-[#0F3D5E]">{icon}<p className="font-bold text-[#1C1B18]">{title}</p></div><p className="mt-2 text-sm text-[#78716C]">{detail}</p></div>;
}

function IntegrationSkeleton() {
  return <div aria-label="Loading integration health" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]"><div className="h-64 animate-pulse rounded-2xl bg-[#F1EEE8]" /><div className="h-80 animate-pulse rounded-2xl bg-[#F1EEE8]" /></div>;
}
