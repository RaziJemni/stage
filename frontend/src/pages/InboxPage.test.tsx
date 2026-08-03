import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InboxPage } from './InboxPage';

describe('InboxPage', () => {
  const baseProps = {
    conversations: [],
    error: null,
    loading: false,
    propertyNames: {},
    onRetry: vi.fn(),
    onSelectConversation: vi.fn(),
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
      escalation_reason: null,
    }]} />);
    fireEvent.click(screen.getByRole('button', { name: /\+21699887766/ }));
    expect(onSelectConversation).toHaveBeenCalledWith('conversation-1');
  });
});
