import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AcceptInvitePage } from './AcceptInvitePage';
import { useAuth } from '../auth/useAuth';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

describe('AcceptInvitePage', () => {
  it('shows a clear error when the invitation token is missing', () => {
    vi.mocked(useAuth).mockReturnValue({ identity: null, acceptInvitation: vi.fn() } as unknown as ReturnType<typeof useAuth>);
    render(<MemoryRouter><AcceptInvitePage /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('missing its token');
    expect(screen.getByRole('button', { name: 'Activate account' })).toBeDisabled();
  });
});
