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
} from 'lucide-react';
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

const feedProviders: Array<{ value: CalendarFeedChannelType; label: string }> = [
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'booking_com', label: 'Booking.com' },
  { value: 'other', label: 'Other iCalendar' },
];

export function SettingsPage() {
  const { identity } = useAuth();
  const [activeTab, setActiveTab] = useState<'team' | 'company' | 'channels'>('team');

  if (!identity || identity.user.role !== 'manager') return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div className="border-b border-[#EBE6DD] pb-6">
        <span className="rounded-lg border border-[#B6DAEA] bg-[#F0F6FA] px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#0F3D5E]">System administration</span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#1C1B18]">Company Settings & Team Access</h1>
        <p className="mt-0.5 text-sm text-[#78716C]">Manage authenticated staff and review truthful integration status.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto border-b border-[#EBE6DD]">
        <Tab active={activeTab === 'team'} onClick={() => setActiveTab('team')}><Users className="h-4 w-4" /> Team</Tab>
        <Tab active={activeTab === 'company'} onClick={() => setActiveTab('company')}><Building className="h-4 w-4" /> Company</Tab>
        <Tab active={activeTab === 'channels'} onClick={() => setActiveTab('channels')}><Globe className="h-4 w-4" /> Integrations</Tab>
      </div>
      {activeTab === 'team' && <TeamManagementPanel />}
      {activeTab === 'company' && (
        <div className="max-w-2xl space-y-4 rounded-2xl border border-[#EBE6DD] bg-white p-6 shadow-sm">
          <div><div className="text-xs font-semibold text-[#78716C]">Company</div><div className="mt-1 font-bold text-[#1C1B18]">{identity.company.name}</div></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><div className="text-xs font-semibold text-[#78716C]">Timezone</div><div className="mt-1 text-sm">{identity.company.timezone}</div></div><div><div className="text-xs font-semibold text-[#78716C]">Currency</div><div className="mt-1 text-sm">{identity.company.default_currency}</div></div></div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Company profile editing belongs to the later Settings workflow. These values come from the authenticated company record.</div>
        </div>
      )}
      {activeTab === 'channels' && <IntegrationsPanel companyTimezone={identity.company.timezone} />}
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 pb-3 text-xs font-bold ${active ? 'border-[#0F3D5E] text-[#0F3D5E]' : 'border-transparent text-[#78716C]'}`}>{children}</button>;
}

function IntegrationsPanel({ companyTimezone }: { companyTimezone: string }) {
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
      setError(cause instanceof ApiError ? cause.message : 'Integration health could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const refreshFeed = async (channelId: string) => {
    setRefreshingFeed(channelId);
    setRefreshMessage(null);
    setRefreshError(null);
    try {
      await requestCalendarFeedSync(channelId);
      setRefreshMessage('Refresh queued. Feed health will update after the worker runs.');
      await load();
    } catch (cause) {
      setRefreshError(cause instanceof ApiError ? cause.message : 'Refresh could not be queued.');
    } finally {
      setRefreshingFeed(null);
    }
  };

  if (loading) return <IntegrationSkeleton />;
  if (error) {
    return (
      <div role="alert" className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        <div className="flex items-start gap-3"><WifiOff className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">Integration health could not be loaded.</p><p className="mt-1">{error}</p></div></div>
        <button onClick={() => void load()} className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-800">Retry integrations</button>
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
          <div><h2 id="calendar-integrations-heading" className="text-lg font-bold text-[#1C1B18]">Calendar feeds</h2><p className="mt-1 text-sm text-[#78716C]">Health is calculated from the latest persisted sync. Feed addresses are kept private.</p></div>
          {properties.length === 0 ? (
            <EmptyState icon={<Building className="h-5 w-5" />} title="No active properties" detail="Add an active property before configuring an iCalendar feed." />
          ) : feeds.length === 0 ? (
            <EmptyState icon={<Globe className="h-5 w-5" />} title="No calendar feeds configured" detail="Add an iCalendar feed below to start importing reservations and blocked periods." />
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
    if (!propertyId) return setFormError('Select a property.');
    if (!trimmedUrl) return setFormError('Enter an iCalendar feed URL.');
    try {
      const parsed = new URL(trimmedUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported_protocol');
    } catch {
      return setFormError('Enter a valid HTTP or HTTPS feed URL.');
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
      setFormSuccess('Feed saved. Refresh health after the next sync or request a refresh from its card.');
      await onSaved();
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : 'Feed could not be saved.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="h-fit space-y-4 rounded-2xl border border-[#EBE6DD] bg-white p-5 shadow-sm" aria-labelledby="feed-setup-heading">
      <div><h2 id="feed-setup-heading" className="text-lg font-bold text-[#1C1B18]">Set up an iCalendar feed</h2><p className="mt-1 text-sm text-[#78716C]">To update an existing feed, enter its replacement URL. Stored addresses are never prefilled.</p></div>
      {formSuccess && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{formSuccess}</div>}
      {formError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{formError}</div>}
      <label className="block text-xs font-bold text-[#57534E]">Property<select aria-label="Feed property" value={propertyId} onChange={(event) => setPropertyId(event.target.value)} disabled={properties.length === 0 || submitting} className="mt-1 w-full rounded-lg border border-[#D6D0C7] bg-white px-3 py-2 text-sm"><option value="">Select property</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>
      <label className="block text-xs font-bold text-[#57534E]">Provider<select aria-label="Feed provider" value={provider} onChange={(event) => setProvider(event.target.value as CalendarFeedChannelType)} disabled={submitting} className="mt-1 w-full rounded-lg border border-[#D6D0C7] bg-white px-3 py-2 text-sm">{feedProviders.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className="block text-xs font-bold text-[#57534E]">iCalendar feed URL<input aria-label="iCalendar feed URL" type="url" required value={url} onChange={(event) => setUrl(event.target.value)} disabled={properties.length === 0 || submitting} className="mt-1 w-full rounded-lg border border-[#D6D0C7] px-3 py-2 text-sm" placeholder="Paste an HTTP or HTTPS feed address" /></label>
      <label className="block text-xs font-bold text-[#57534E]">External listing ID <span className="font-normal text-[#78716C]">(optional)</span><input aria-label="External listing ID" value={externalListingId} onChange={(event) => setExternalListingId(event.target.value)} disabled={properties.length === 0 || submitting} className="mt-1 w-full rounded-lg border border-[#D6D0C7] px-3 py-2 text-sm" /></label>
      {properties.length === 0 && <p className="text-xs text-[#78716C]">Create an active property first.</p>}
      <button type="submit" disabled={properties.length === 0 || submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F3D5E] px-3 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}Save feed</button>
    </form>
  );
}

function FeedCard({ feed, property, companyTimezone, refreshing, onRefresh }: { feed: CalendarFeedHealth; property?: ApiProperty; companyTimezone: string; refreshing: boolean; onRefresh: () => void }) {
  const provider = feedProviders.find((option) => option.value === feed.channel_type)?.label ?? 'Other iCalendar';
  return (
    <article className="rounded-2xl border border-[#EBE6DD] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-[#1C1B18]">{provider}</p><p className="mt-1 text-xs text-[#78716C]">{property?.name ?? 'Property unavailable'}</p></div><StatusBadge status={feed.health_status} /></div>
      <div className="mt-4 grid gap-2 text-xs text-[#57534E] sm:grid-cols-2"><Timestamp label="Last successful sync" value={feed.last_successful_sync_at} timezone={companyTimezone} /><Timestamp label="Last attempt" value={feed.last_sync_at} timezone={companyTimezone} /></div>
      {feed.last_error_summary && <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-800">{feed.last_error_summary}</p>}
      <button type="button" onClick={onRefresh} disabled={refreshing || !feed.is_active} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#B6DAEA] px-3 py-2 text-xs font-bold text-[#0F3D5E] disabled:cursor-not-allowed disabled:opacity-50">{refreshing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}{refreshing ? 'Queueing refresh…' : 'Refresh now'}</button>
    </article>
  );
}

function WhatsappCard({ health }: { health: WhatsappIntegrationHealth | null }) {
  if (!health) return null;
  const copy: Record<WhatsappHealthStatus, { label: string; icon: ReactNode; className: string }> = {
    simulator: { label: 'Simulator only', icon: <FlaskConical className="h-4 w-4" />, className: 'border-amber-200 bg-amber-50 text-amber-800' },
    test: { label: 'Provider test mode', icon: <CircleDot className="h-4 w-4" />, className: 'border-blue-200 bg-blue-50 text-blue-900' },
    unconfigured: { label: 'Production unconfigured', icon: <WifiOff className="h-4 w-4" />, className: 'border-slate-200 bg-slate-50 text-slate-800' },
  };
  const state = copy[health.health_status];
  return <section className="rounded-2xl border border-[#EBE6DD] bg-white p-5 shadow-sm" aria-labelledby="whatsapp-integration-heading"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="whatsapp-integration-heading" className="font-bold text-[#1C1B18]">WhatsApp Business</h2><p className="mt-1 text-xs text-[#78716C]">Outbound production delivery is not enabled by this application.</p></div><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${state.className}`}>{state.icon}{state.label}</span></div><p className="mt-4 text-sm text-[#57534E]">{health.detail}</p></section>;
}

function StatusBadge({ status }: { status: FeedHealthStatus }) {
  const definitions: Record<FeedHealthStatus, { label: string; icon: ReactNode; className: string }> = {
    pending: { label: 'Pending first sync', icon: <Clock3 className="h-3.5 w-3.5" />, className: 'border-slate-200 bg-slate-50 text-slate-700' },
    running: { label: 'Sync running', icon: <LoaderCircle className="h-3.5 w-3.5 animate-spin" />, className: 'border-blue-200 bg-blue-50 text-blue-900' },
    healthy: { label: 'Healthy', icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
    stale: { label: 'Stale', icon: <AlertTriangle className="h-3.5 w-3.5" />, className: 'border-amber-200 bg-amber-50 text-amber-800' },
    partial: { label: 'Partial import', icon: <AlertTriangle className="h-3.5 w-3.5" />, className: 'border-amber-200 bg-amber-50 text-amber-800' },
    failed: { label: 'Failed', icon: <XCircle className="h-3.5 w-3.5" />, className: 'border-red-200 bg-red-50 text-red-800' },
    inactive: { label: 'Inactive', icon: <WifiOff className="h-3.5 w-3.5" />, className: 'border-slate-200 bg-slate-50 text-slate-700' },
  };
  const definition = definitions[status];
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${definition.className}`}>{definition.icon}{definition.label}</span>;
}

function Timestamp({ label, value, timezone }: { label: string; value: string | null; timezone: string }) {
  return <div><span className="font-semibold">{label}: </span>{value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(value)) : 'Not yet recorded'}</div>;
}

function EmptyState({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return <div className="rounded-2xl border border-dashed border-[#D6D0C7] bg-[#FCFBF8] p-6"><div className="flex items-center gap-2 text-[#0F3D5E]">{icon}<p className="font-bold text-[#1C1B18]">{title}</p></div><p className="mt-2 text-sm text-[#78716C]">{detail}</p></div>;
}

function IntegrationSkeleton() {
  return <div aria-label="Loading integration health" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]"><div className="h-64 animate-pulse rounded-2xl bg-[#F1EEE8]" /><div className="h-80 animate-pulse rounded-2xl bg-[#F1EEE8]" /></div>;
}
