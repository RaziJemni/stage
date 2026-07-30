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

  it('opens the mobile profile sheet and supports logout', () => {
    const onLogout = vi.fn();
    renderSidebar({ id: 'staff-1', name: 'Amira', email: 'amira@example.com', role: 'staff', status: 'active' }, onLogout);

    fireEvent.click(screen.getByRole('button', { name: 'Profile' }));

    expect(screen.getByRole('dialog', { name: 'Amira' })).toBeInTheDocument();
    expect(screen.getByText('amira@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Company Settings' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Log out from mobile profile' }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('keeps company settings available to managers from the mobile profile', () => {
    const onNavigate = vi.fn();
    render(<Sidebar activePage="dashboard" onNavigate={onNavigate} onLogout={vi.fn()} unreadMessagesCount={0} openTicketsCount={0} hasCalendarConflict={false} user={{ id: 'manager-1', name: 'Youssef', email: 'manager@example.com', role: 'manager', status: 'active' }} company={company} />);

    fireEvent.click(screen.getByRole('button', { name: 'Profile' }));
    fireEvent.click(screen.getByRole('button', { name: 'Company Settings' }));

    expect(onNavigate).toHaveBeenCalledWith('settings');
    expect(screen.queryByRole('dialog', { name: 'Youssef' })).not.toBeInTheDocument();
  });
});

function renderSidebar(user: AuthUser, onLogout = vi.fn()) {
  return render(<Sidebar activePage="dashboard" onNavigate={vi.fn()} onLogout={onLogout} unreadMessagesCount={0} openTicketsCount={0} hasCalendarConflict={false} user={user} company={company} />);
}
