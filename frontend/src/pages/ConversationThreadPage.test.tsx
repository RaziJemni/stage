import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConversationThreadPage } from './ConversationThreadPage';
import { I18nProvider } from '../i18n/I18nContext';

describe('ConversationThreadPage', () => {
  function renderWithLocale(ui: React.ReactElement, locale: 'en' | 'fr' = 'en') {
    return render(
      <I18nProvider initialLocale={locale}>
        {ui}
      </I18nProvider>
    );
  }

  it('shows the persisted escalation reason to staff', () => {
    renderWithLocale(<ConversationThreadPage
      conversation={{
        id: 'conversation-1',
        property_id: 'property-1',
        guest_contact_identifier: '+21699887766',
        status: 'open',
      handling_mode: 'manual',
      last_message_at: '2026-08-03T12:00:00Z',
      last_message_sender_type: 'guest',
      escalation_reason: 'payment_or_refund',
      unread_message_count: 0,
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
    renderWithLocale(<ConversationThreadPage
      conversation={{
        id: 'conversation-1',
        property_id: 'property-1',
        guest_contact_identifier: '+21699887766',
        status: 'open',
      handling_mode: 'manual',
      last_message_at: '2026-08-03T12:00:00Z',
      last_message_sender_type: 'staff',
      escalation_reason: null,
      unread_message_count: 0,
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

  it('renders automated post-stay review request with badge', () => {
    renderWithLocale(<ConversationThreadPage
      conversation={{
        id: 'conversation-1',
        property_id: 'property-1',
        guest_contact_identifier: '+21699887766',
        status: 'open',
        handling_mode: 'automatic',
        last_message_at: '2026-08-03T12:00:00Z',
        last_message_sender_type: 'system',
        escalation_reason: null,
        unread_message_count: 0,
      }}
      messages={[{
        id: 'message-review-1',
        conversation_id: 'conversation-1',
        direction: 'outbound',
        sender_type: 'system',
        content: 'Dear Guest, thank you for staying with us!',
        delivery_status: 'queued',
        automatically_sent: true,
        external_message_id: 'review-request-booking-1',
        created_at: '2026-08-03T12:00:00Z',
      }]}
      loading={false}
      error={null}
      sending={false}
      propertyName="Villa Yasmine"
      onBackToInbox={vi.fn()}
      onRetry={vi.fn()}
      onToggleHandlingMode={vi.fn()}
      onSendMessage={vi.fn()}
    />);
    expect(screen.getByText('Post-stay review request')).toBeInTheDocument();
    expect(screen.getByText(/Automated Sequence.*queued/)).toBeInTheDocument();
  });

  it('renders French interface by default with escalation and review badges', () => {
    const onSendMessage = vi.fn();
    renderWithLocale(<ConversationThreadPage
      conversation={{
        id: 'conversation-fr',
        property_id: 'property-1',
        guest_contact_identifier: '+21699887766',
        status: 'open',
        handling_mode: 'manual',
        last_message_at: '2026-08-03T12:00:00Z',
        last_message_sender_type: 'guest',
        escalation_reason: 'payment_or_refund',
        unread_message_count: 0,
      }}
      messages={[{
        id: 'message-fr-1',
        conversation_id: 'conversation-fr',
        direction: 'outbound',
        sender_type: 'system',
        content: 'Merci pour votre séjour !',
        delivery_status: 'queued',
        automatically_sent: true,
        external_message_id: 'review-request-booking-2',
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
    />, 'fr');

    expect(screen.getByRole('status')).toHaveTextContent('Escalade: Paiement ou remboursement');
    expect(screen.getByText("Demande d'avis envoyée")).toBeInTheDocument();
    expect(screen.getByText(/Séquence automatisée.*queued/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Mode manuel — revenir à l'automatique" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Rédiger une réponse manuelle...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeInTheDocument();
  });
});
