import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TeamManagementPanel } from './TeamManagementPanel';
import { apiRequest } from '../auth/api';
import { I18nProvider } from '../i18n/I18nContext';

vi.mock('../auth/api', () => ({
  ApiError: class ApiError extends Error {},
  apiRequest: vi.fn(),
}));

const mockMembers = [
  { id: 'user-1', name: 'Manager Boss', email: 'manager@vayca.tn', role: 'manager' as const, status: 'active' as const },
  { id: 'user-2', name: 'Habib Staff', email: 'habib@vayca.tn', role: 'staff' as const, status: 'active' as const },
  { id: 'user-3', name: 'Nadia Staff', email: 'nadia@vayca.tn', role: 'staff' as const, status: 'invited' as const },
];

describe('TeamManagementPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiRequest).mockResolvedValue({ items: mockMembers });
  });

  function renderWithLocale(ui: React.ReactElement, locale: 'en' | 'fr' = 'fr') {
    return render(
      <I18nProvider initialLocale={locale}>
        {ui}
      </I18nProvider>
    );
  }

  it('renders team table with French localization by default', async () => {
    renderWithLocale(<TeamManagementPanel />, 'fr');

    expect(screen.getByText('Chargement de l\'équipe…')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Habib Staff')).toBeInTheDocument();
    });

    expect(screen.getByText('Membre de l\'équipe')).toBeInTheDocument();
    expect(screen.getByText('Gestionnaire')).toBeInTheDocument();
    expect(screen.getAllByText('Personnel').length).toBe(2);
    expect(screen.getAllByText('Actif').length).toBe(2);
    expect(screen.getByText('Invité')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Désactiver' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inviter un collaborateur' })).toBeInTheDocument();
  });

  it('renders team table in English when locale is set to en', async () => {
    renderWithLocale(<TeamManagementPanel />, 'en');

    await waitFor(() => {
      expect(screen.getByText('Habib Staff')).toBeInTheDocument();
    });

    expect(screen.getByText('Team member')).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();
    expect(screen.getAllByText('Staff').length).toBe(2);
    expect(screen.getAllByText('Active').length).toBe(2);
    expect(screen.getByText('Invited')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invite team member' })).toBeInTheDocument();
  });

  it('toggles invite form and submits new member invitation', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path: string, options?: { method?: string; body?: string }) => {
      if (path === '/api/v1/team/invitations' && options?.method === 'POST') {
        return {
          member: { id: 'user-4', name: 'Sami Staff', email: 'sami@vayca.tn', role: 'staff', status: 'invited' },
          invitation_url: 'http://localhost/invite/token-123',
        };
      }
      return { items: mockMembers };
    });

    renderWithLocale(<TeamManagementPanel />, 'fr');

    await waitFor(() => {
      expect(screen.getByText('Habib Staff')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Inviter un collaborateur' }));

    const nameInput = screen.getByPlaceholderText('Nom du collaborateur');
    const emailInput = screen.getByPlaceholderText('collaborateur@agence.tn');

    fireEvent.change(nameInput, { target: { value: 'Sami Staff' } });
    fireEvent.change(emailInput, { target: { value: 'sami@vayca.tn' } });

    fireEvent.click(screen.getByRole('button', { name: 'Créer l\'invitation' }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/api/v1/team/invitations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Sami Staff', email: 'sami@vayca.tn' }),
      });
    });

    expect(await screen.findByText('Lien d\'invitation de développement')).toBeInTheDocument();
    expect(screen.getByText('http://localhost/invite/token-123')).toBeInTheDocument();
  });

  it('deactivates and activates staff member', async () => {
    vi.mocked(apiRequest).mockImplementation(async (path: string, options?: { method?: string; body?: string }) => {
      if (path === '/api/v1/team/user-2/status' && options?.method === 'PATCH') {
        return { id: 'user-2', name: 'Habib Staff', email: 'habib@vayca.tn', role: 'staff', status: 'inactive' };
      }
      return { items: mockMembers };
    });

    renderWithLocale(<TeamManagementPanel />, 'fr');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Désactiver' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Désactiver' }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/api/v1/team/user-2/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'inactive' }),
      });
    });

    expect(await screen.findByRole('button', { name: 'Activer' })).toBeInTheDocument();
  });
});
