import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from './useAuth';

vi.mock('./useAuth', () => ({ useAuth: vi.fn() }));
const mockedUseAuth = vi.mocked(useAuth);

describe('ProtectedRoute', () => {
  beforeEach(() => mockedUseAuth.mockReset());

  it('redirects an unauthenticated visitor to login', () => {
    mockedUseAuth.mockReturnValue({ identity: null, loading: false, startupError: null } as ReturnType<typeof useAuth>);
    renderRoute();
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders protected content for an authenticated user', () => {
    mockedUseAuth.mockReturnValue({ identity: { user: { id: '1', name: 'Amira', email: 'amira@example.com', role: 'staff', status: 'active' }, company: { id: '2', name: 'Agency', timezone: 'Africa/Tunis', default_currency: 'TND' }, permissions: ['operations:access'] }, loading: false, startupError: null } as ReturnType<typeof useAuth>);
    renderRoute();
    expect(screen.getByText('Protected workspace')).toBeInTheDocument();
  });
});

function renderRoute() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<ProtectedRoute />}><Route path="/" element={<div>Protected workspace</div>} /></Route>
      </Routes>
    </MemoryRouter>,
  );
}
