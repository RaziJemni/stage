import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InboxPage } from './InboxPage';

describe('InboxPage', () => {
  const baseProps = {
    conversations: [],
    totalConversations: 0,
    error: null,
    loading: false,
    propertyNames: {},
    onRetry: vi.fn(),
    onSelectConversation: vi.fn(),
    filter: 'all' as const,
    onFilterChange: vi.fn(),
  };

  it('renders loading, empty, and retryable failure states', () => {
    const { rerender } = render(<InboxPage {...baseProps} loading />);
    expect(screen.getByText('Loading conversations...')).toBeInTheDocument();

    rerender(<InboxPage {...baseProps} />);
    expect(screen.getByText(/No conversations match this view/)).toBeInTheDocument();

    const onRetry = vi.fn();
    rerender(<InboxPage {...baseProps} error="Unable to reach the API." onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('opens a selected persisted conversation', () => {
    const onSelectConversation = vi.fn();
    render(<InboxPage {...baseProps} propertyNames={{ 'property-1': 'Villa Yasmine' }} onSelectConversation={onSelectConversation} conversations={[{
      id: 'conversation-1',
      property_id: 'property-1',
      guest_contact_identifier: '+21699887766',
      status: 'open',
      handling_mode: 'automatic',
      last_message_at: '2026-08-03T12:00:00Z',
      last_message_sender_type: 'guest',
      escalation_reason: null,
      unread_message_count: 2,
    }]} />);
    fireEvent.click(screen.getByRole('button', { name: /\+21699887766/ }));
    expect(onSelectConversation).toHaveBeenCalledWith('conversation-1');
    expect(screen.getByText('Unread 2')).toBeInTheDocument();
    expect(screen.getByText('Last source: Guest')).toBeInTheDocument();
  });

  it('sends the selected server-side filter', () => {
    const onFilterChange = vi.fn();
    render(<InboxPage {...baseProps} onFilterChange={onFilterChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Unread' }));
    expect(onFilterChange).toHaveBeenCalledWith('unread');
  });
});
