import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OwnersManagementPanel } from './OwnersManagementPanel';
import { I18nProvider } from '../i18n/I18nContext';
import * as ownersApi from '../api/owners';

vi.mock('../api/owners', () => ({
  fetchOwners: vi.fn(),
  createOwner: vi.fn(),
  updateOwner: vi.fn(),
}));

const mockOwners: ownersApi.ApiOwner[] = [
  {
    id: 'owner-1',
    company_id: 'company-1',
    name: 'Leila Mansour',
    email: 'leila@example.com',
    phone: '+216 98 222 333',
    commission_percentage: 18.5,
    notes: 'Bank: BIAT RIB 0800...',
    is_active: true,
    properties_count: 3,
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
  },
];

function renderPanel(locale: 'en' | 'fr' = 'en') {
  return render(
    <I18nProvider initialLocale={locale}>
      <OwnersManagementPanel />
    </I18nProvider>
  );
}

describe('OwnersManagementPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list of partner owners with commission and property counts', async () => {
    vi.mocked(ownersApi.fetchOwners).mockResolvedValue(mockOwners);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('Leila Mansour')).toBeInTheDocument();
    });

    expect(screen.getByText('leila@example.com')).toBeInTheDocument();
    expect(screen.getByText('+216 98 222 333')).toBeInTheDocument();
    expect(screen.getByText('18.5%')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('creates a new owner via modal submission', async () => {
    vi.mocked(ownersApi.fetchOwners).mockResolvedValue([]);
    const createdOwner: ownersApi.ApiOwner = {
      id: 'owner-2',
      company_id: 'company-1',
      name: 'Tarek Chahed',
      email: 'tarek@example.com',
      phone: null,
      commission_percentage: 15.0,
      notes: null,
      is_active: true,
      properties_count: 0,
      created_at: '2026-09-01T10:00:00Z',
      updated_at: '2026-09-01T10:00:00Z',
    };
    vi.mocked(ownersApi.createOwner).mockResolvedValue(createdOwner);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('No owners configured yet.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /Add Owner/i })[0]);

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Mounir Ben Salah/i), {
      target: { value: 'Tarek Chahed' },
    });
    fireEvent.change(screen.getByPlaceholderText(/mounir@example\.com/i), {
      target: { value: 'tarek@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(ownersApi.createOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Tarek Chahed',
          email: 'tarek@example.com',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Tarek Chahed')).toBeInTheDocument();
    });
  });
});
