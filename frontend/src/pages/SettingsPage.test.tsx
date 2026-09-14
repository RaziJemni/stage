import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../auth/useAuth';
import {
  configureCalendarFeed,
  fetchCalendarFeeds,
  requestCalendarFeedSync,
} from '../api/calendar';
import { fetchAllActiveProperties } from '../api/properties';
import { fetchWhatsappIntegrationHealth } from '../api/integrations';
import { SettingsPage } from './SettingsPage';
import { I18nProvider } from '../i18n/I18nContext';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../api/calendar', () => ({
  configureCalendarFeed: vi.fn(),
  fetchCalendarFeeds: vi.fn(),
  requestCalendarFeedSync: vi.fn(),
}));
vi.mock('../api/properties', () => ({ fetchAllActiveProperties: vi.fn() }));
vi.mock('../api/integrations', () => ({ fetchWhatsappIntegrationHealth: vi.fn() }));
vi.mock('../components/TeamManagementPanel', () => ({ TeamManagementPanel: () => <div>Team panel</div> }));
vi.mock('../components/OwnersManagementPanel', () => ({ OwnersManagementPanel: () => <div>Owners panel</div> }));

const property = {
  id: 'property-1',
  company_id: 'company-1',
  name: 'Villa Yasmine',
  address_line1: null,
  address_line2: null,
  city: 'Hammamet',
  postal_code: null,
  country_code: 'TN',
  timezone: 'Africa/Tunis',
  max_guests: 8,
  check_in_time: null,
  check_out_time: null,
  wifi_network: null,
  wifi_password: null,
  parking_info: null,
  amenities: null,
  house_rules: null,
  emergency_contact: null,
  directions: null,
  external_booking_url: null,
  status: 'active' as const,
  archived_at: null,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
};

const feed = {
  id: 'feed-1',
  property_id: 'property-1',
  channel_type: 'airbnb' as const,
  is_active: true,
  health_status: 'healthy' as const,
  last_successful_sync_at: '2026-08-10T12:00:00Z',
  last_sync_at: '2026-08-10T12:01:00Z',
  last_sync_status: 'succeeded' as const,
  last_error_summary: null,
};

const managerIdentity = {
  user: { id: 'user-1', name: 'Manager', email: 'manager@example.com', role: 'manager' as const, status: 'active' as const },
  company: { id: 'company-1', name: 'Agency', timezone: 'Africa/Tunis', default_currency: 'TND' },
  permissions: ['operations:access'],
};

function configureApi() {
  vi.mocked(useAuth).mockReturnValue({ identity: managerIdentity, loading: false, startupError: null } as ReturnType<typeof useAuth>);
  vi.mocked(fetchAllActiveProperties).mockResolvedValue([property]);
  vi.mocked(fetchCalendarFeeds).mockResolvedValue([feed]);
  vi.mocked(fetchWhatsappIntegrationHealth).mockResolvedValue({
    integration: 'whatsapp',
    mode: 'simulator',
    health_status: 'simulator',
    detail: 'Local simulator only; no WhatsApp messages are sent.',
  });
  vi.mocked(configureCalendarFeed).mockResolvedValue({
    id: 'feed-1', property_id: 'property-1', channel_type: 'airbnb', external_listing_id: null,
    calendar_url: 'https://private.example/feed.ics', is_active: true, last_successful_sync_at: null, last_error_summary: null,
  });
  vi.mocked(requestCalendarFeedSync).mockResolvedValue({ channel_id: 'feed-1', status: 'queued' });
}

describe('SettingsPage integrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureApi();
  });

  function renderWithLocale(ui: React.ReactElement, locale: 'en' | 'fr' = 'en') {
    return render(
      <I18nProvider initialLocale={locale}>
        {ui}
      </I18nProvider>
    );
  }

  async function openIntegrations() {
    renderWithLocale(<SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: /Integrations/i }));
    await screen.findByRole('heading', { name: 'Calendar feeds' });
  }

  it('loads live feed health and truthful WhatsApp mode without rendering a feed URL', async () => {
    await openIntegrations();

    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('Simulator only')).toBeInTheDocument();
    expect(screen.getAllByText('Villa Yasmine').length).toBeGreaterThan(0);
    expect(screen.queryByText('https://private.example/feed.ics')).not.toBeInTheDocument();
  });

  it('renders every calendar health state', async () => {
    const statuses = ['pending', 'running', 'healthy', 'stale', 'partial', 'failed', 'inactive'] as const;
    vi.mocked(fetchCalendarFeeds).mockResolvedValue(statuses.map((health_status, index) => ({
      ...feed,
      id: `feed-${index}`,
      health_status,
      is_active: health_status !== 'inactive',
      last_error_summary: health_status === 'failed' ? 'Provider returned an invalid calendar.' : null,
    })));
    await openIntegrations();

    expect(screen.getByText('Pending first sync')).toBeInTheDocument();
    expect(screen.getByText('Sync running')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('Stale')).toBeInTheDocument();
    expect(screen.getByText('Partial import')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows no-property and no-feed states', async () => {
    vi.mocked(fetchAllActiveProperties).mockResolvedValueOnce([]);
    vi.mocked(fetchCalendarFeeds).mockResolvedValueOnce([]);
    await openIntegrations();
    expect(screen.getByText('No active properties')).toBeInTheDocument();

    cleanup();
    vi.clearAllMocks();
    configureApi();
    vi.mocked(fetchCalendarFeeds).mockResolvedValueOnce([]);
    renderWithLocale(<SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: /Integrations/i }));
    expect(await screen.findByText('No calendar feeds configured')).toBeInTheDocument();
  });

  it('validates, saves, clears the URL, and reloads after feed setup', async () => {
    await openIntegrations();
    const urlInput = screen.getByLabelText('iCalendar feed URL');
    fireEvent.change(urlInput, { target: { value: 'ftp://invalid.example/feed.ics' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Set up an iCalendar feed' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('valid HTTP or HTTPS');
    expect(configureCalendarFeed).not.toHaveBeenCalled();

    fireEvent.change(urlInput, { target: { value: 'https://replacement.example/feed.ics' } });
    fireEvent.change(screen.getByLabelText('External listing ID'), { target: { value: 'listing-42' } });
    fireEvent.change(screen.getByLabelText('Feed provider'), { target: { value: 'booking_com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save feed' }));

    await waitFor(() => expect(configureCalendarFeed).toHaveBeenCalledWith('property-1', {
      channel_type: 'booking_com',
      calendar_url: 'https://replacement.example/feed.ics',
      external_listing_id: 'listing-42',
    }));
    await waitFor(() => expect(urlInput).toHaveValue(''));
    expect(screen.queryByText('https://replacement.example/feed.ics')).not.toBeInTheDocument();
  });

  it('offers Vrbo and Expedia iCalendar feed providers', async () => {
    await openIntegrations();
    const provider = screen.getByLabelText('Feed provider');
    expect(screen.getByRole('option', { name: 'Vrbo' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Expedia' })).toBeInTheDocument();

    fireEvent.change(provider, { target: { value: 'vrbo' } });
    fireEvent.change(screen.getByLabelText('iCalendar feed URL'), {
      target: { value: 'https://calendar.example.test/vrbo.ics' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save feed' }));

    await waitFor(() => expect(configureCalendarFeed).toHaveBeenCalledWith('property-1', {
      channel_type: 'vrbo',
      calendar_url: 'https://calendar.example.test/vrbo.ics',
      external_listing_id: null,
    }));
  });

  it('queues a feed refresh and reports that health is still pending worker output', async () => {
    await openIntegrations();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh now' }));
    await waitFor(() => expect(requestCalendarFeedSync).toHaveBeenCalledWith('feed-1'));
    expect(await screen.findByRole('status')).toHaveTextContent('Refresh queued');
  });

  it('shows a retryable loading error and hides Settings from staff', async () => {
    vi.mocked(fetchAllActiveProperties).mockRejectedValueOnce(new Error('unavailable'));
    renderWithLocale(<SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: /Integrations/i }));
    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');
    expect(screen.getByRole('button', { name: 'Retry integrations' })).toBeInTheDocument();

    const staffIdentity = { ...managerIdentity, user: { ...managerIdentity.user, role: 'staff' as const } };
    vi.mocked(useAuth).mockReturnValue({ identity: staffIdentity, loading: false, startupError: null } as ReturnType<typeof useAuth>);
    cleanup();
    const { container } = renderWithLocale(<SettingsPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders language selector and switches between French and English in Settings', () => {
    renderWithLocale(<SettingsPage />, 'fr');
    // In French by default
    expect(screen.getByText("Paramètres de l'entreprise & Accès équipe")).toBeInTheDocument();

    // Click Preferences tab
    fireEvent.click(screen.getByRole('button', { name: /Préférences & Langue/i }));
    expect(screen.getByRole('heading', { name: "Langue de l'interface" })).toBeInTheDocument();

    // Switch to English
    fireEvent.click(screen.getByRole('button', { name: /Select English/i }));
    expect(screen.getByRole('heading', { name: 'Interface Language' })).toBeInTheDocument();
    expect(screen.getByText('Company Settings & Team Access')).toBeInTheDocument();
    expect(window.localStorage.getItem('vayca_locale')).toBe('en');

    // Switch back to French
    fireEvent.click(screen.getByRole('button', { name: /Sélectionner Français/i }));
    expect(screen.getByRole('heading', { name: "Langue de l'interface" })).toBeInTheDocument();
    expect(window.localStorage.getItem('vayca_locale')).toBe('fr');
  });

  it('renders standardized WorkstationHeader with breadcrumbs and admin badge', () => {
    renderWithLocale(<SettingsPage />, 'fr');
    expect(screen.getByText('OPÉRATIONS')).toBeInTheDocument();
    expect(screen.getByText('Paramètres')).toBeInTheDocument();
    expect(screen.getByText('Administration système')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: "Paramètres de l'entreprise & Accès équipe" })).toBeInTheDocument();
  });

  it('renders channel integrations in French with localized feed cards and forms', async () => {
    renderWithLocale(<SettingsPage />, 'fr');
    fireEvent.click(screen.getByRole('button', { name: /Intégrations/i }));
    expect(await screen.findByRole('heading', { name: 'Flux de calendrier iCalendar' })).toBeInTheDocument();
    expect(screen.getByText('Sain')).toBeInTheDocument();
    expect(screen.getByText('Simulateur uniquement')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Configurer un flux iCalendar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer le flux' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualiser maintenant' })).toBeInTheDocument();
  });

  it('displays preferenceError alert with retry button when preference saving fails', () => {
    const clearErrorMock = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      identity: managerIdentity,
      loading: false,
      startupError: null,
      preferenceError: 'Failed to persist language preference.',
      clearPreferenceError: clearErrorMock,
      updatePreferences: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    renderWithLocale(<SettingsPage />, 'fr');
    fireEvent.click(screen.getByRole('button', { name: /Préférences & Langue/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to persist language preference.');
    const retryBtn = screen.getByRole('button', { name: 'Réessayer' });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(clearErrorMock).toHaveBeenCalled();
  });

  it('switches to owners tab and renders owners panel', () => {
    renderWithLocale(<SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: /Propriétaires|Owners/i }));
    expect(screen.getByText('Owners panel')).toBeInTheDocument();
  });
});
