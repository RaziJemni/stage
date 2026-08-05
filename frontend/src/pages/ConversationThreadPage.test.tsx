import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConversationThreadPage } from './ConversationThreadPage';

describe('ConversationThreadPage', () => {
  it('shows the persisted escalation reason to staff', () => {
    render(<ConversationThreadPage
      conversation={{
        id: 'conversation-1',
        property_id: 'property-1',
        guest_contact_identifier: '+21699887766',
        status: 'open',
        handling_mode: 'manual',
        last_message_at: '2026-08-03T12:00:00Z',
        escalation_reason: 'payment_or_refund',
      }}
      messages={[]}
      loading={false}
      error={null}
      sending={false}
      propertyName="Villa Yasmine"
      onBackToInbox={vi.fn()}
      onRetry={vi.fn()}
      onToggleHandlingMode={vi.fn()}
      onSendMessage={vi.fn()}
    />);
    expect(screen.getByRole('status')).toHaveTextContent('Escalated: Payment or refund');
  });

  it('sends a manual reply and exposes the delivery state', () => {
    const onSendMessage = vi.fn();
    render(<ConversationThreadPage
      conversation={{
        id: 'conversation-1',
        property_id: 'property-1',
        guest_contact_identifier: '+21699887766',
        status: 'open',
        handling_mode: 'manual',
        last_message_at: '2026-08-03T12:00:00Z',
        escalation_reason: null,
      }}
      messages={[{
        id: 'message-1',
        conversation_id: 'conversation-1',
        direction: 'outbound',
        sender_type: 'staff',
        content: 'We can help with that.',
        delivery_status: 'queued',
        automatically_sent: false,
        created_at: '2026-08-03T12:00:00Z',
      }]}
      loading={false}
      error={null}
      sending={false}
      propertyName="Villa Yasmine"
      onBackToInbox={vi.fn()}
      onRetry={vi.fn()}
      onToggleHandlingMode={vi.fn()}
      onSendMessage={onSendMessage}
    />);
    expect(screen.getByText(/staff.*queued/)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Write a manual reply...'), { target: { value: 'I will confirm shortly.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSendMessage).toHaveBeenCalledWith('I will confirm shortly.');
  });
});
