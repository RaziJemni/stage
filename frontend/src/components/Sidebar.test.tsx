import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';
import type { AuthUser } from '../auth/types';

const company = { id: 'company-1', name: 'Hammamet Agency', timezone: 'Africa/Tunis', default_currency: 'TND' };

describe('Sidebar authorization', () => {
  it('hides Settings from staff', () => {
    renderSidebar({ id: 'staff-1', name: 'Amira', email: 'amira@example.com', role: 'staff', status: 'active' });
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    expect(screen.getByText(/Amira/)).toBeInTheDocument();
  });

  it('shows Settings to managers and supports logout', () => {
    const onLogout = vi.fn();
    renderSidebar({ id: 'manager-1', name: 'Youssef', email: 'manager@example.com', role: 'manager', status: 'active' }, onLogout);
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByTitle('Log out')[0]);
    expect(onLogout).toHaveBeenCalledOnce();
  });
});

function renderSidebar(user: AuthUser, onLogout = vi.fn()) {
  return render(<Sidebar activePage="dashboard" onNavigate={vi.fn()} onLogout={onLogout} unreadMessagesCount={0} openTicketsCount={0} hasCalendarConflict={false} user={user} company={company} />);
}
