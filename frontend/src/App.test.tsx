import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import * as messagingApi from './api/messaging';
import * as propertiesApi from './api/properties';
import { useAuth } from './auth/useAuth';

vi.mock('./api/messaging');
vi.mock('./api/properties');
vi.mock('./auth/useAuth', () => ({ useAuth: vi.fn() }));

const conversation = {
  id: 'conversation-1',
  property_id: 'property-1',
  guest_contact_identifier: '+21699887766',
  status: 'open' as const,
  handling_mode: 'automatic' as const,
  last_message_at: '2026-08-18T12:00:00Z',
  last_message_sender_type: 'guest' as const,
  escalation_reason: null,
  unread_message_count: 1,
};

const page = (items = [conversation], total = items.length) => ({
  items,
  page: 1,
  page_size: 20,
  total,
  pages: 1,
});

function renderApp() {
  render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);
}

describe('App inbox unread state', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      identity: {
        user: { id: 'staff-1', name: 'Amira', email: 'amira@example.com', role: 'staff', status: 'active' },
        company: { id: 'company-1', name: 'Agency', timezone: 'Africa/Tunis', default_currency: 'TND' },
        permissions: ['operations:access'],
      },
      loading: false,
      startupError: null,
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(propertiesApi.fetchProperties).mockResolvedValue({
      items: [], page: 1, page_size: 20, total: 0, pages: 0,
    });
    vi.mocked(messagingApi.fetchConversations).mockImplementation(async (filters = {}) => {
      if (filters.unread) return page([conversation], 7);
      return page();
    });
    vi.mocked(messagingApi.fetchUnreadConversationCount).mockResolvedValue(7);
    vi.mocked(messagingApi.fetchConversationCount).mockResolvedValue(9);
    vi.mocked(messagingApi.fetchMessages).mockResolvedValue([]);
    vi.mocked(messagingApi.markConversationRead).mockResolvedValue({
      ...conversation,
      unread_message_count: 0,
    });
  });

  it('keeps the sidebar unread badge company-wide when the inbox filter changes', async () => {
    renderApp();

    await waitFor(() => expect(messagingApi.fetchUnreadConversationCount).toHaveBeenCalledOnce());
    await waitFor(() => expect(messagingApi.fetchConversationCount).toHaveBeenCalledOnce());
    expect(screen.getByText('7')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Messages' })[0]);
    expect(screen.getByRole('button', { name: 'All (9)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Chatbot handled' }));

    await waitFor(() => expect(messagingApi.fetchConversations).toHaveBeenCalledWith({ handling_mode: 'automatic' }));
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All (9)' })).toBeInTheDocument();
  });

  it('marks a conversation read before loading its history', async () => {
    let resolveMarkRead: (value: typeof conversation) => void;
    const markRead = new Promise<typeof conversation>((resolve) => { resolveMarkRead = resolve; });
    vi.mocked(messagingApi.markConversationRead).mockReturnValueOnce(markRead);
    renderApp();

    fireEvent.click(screen.getAllByRole('button', { name: 'Messages' })[0]);
    const conversationButton = await screen.findByRole('button', { name: /\+21699887766/ });
    fireEvent.click(conversationButton);

    expect(messagingApi.fetchMessages).not.toHaveBeenCalled();
    resolveMarkRead!(conversation);
    await waitFor(() => expect(messagingApi.fetchMessages).toHaveBeenCalledWith('conversation-1'));
  });

  it('loads history but keeps a truthful error when mark-read fails', async () => {
    vi.mocked(messagingApi.markConversationRead).mockRejectedValueOnce(new Error('Unable to mark as read.'));
    renderApp();

    fireEvent.click(screen.getAllByRole('button', { name: 'Messages' })[0]);
    const conversationButton = await screen.findByRole('button', { name: /\+21699887766/ });
    fireEvent.click(conversationButton);

    await waitFor(() => expect(messagingApi.fetchMessages).toHaveBeenCalledWith('conversation-1'));
    expect(screen.getByText('Unable to mark as read.')).toBeInTheDocument();
  });

  it('removes a conversation from the unread view after it is marked read', async () => {
    let unread = true;
    vi.mocked(messagingApi.fetchConversations).mockImplementation(async (filters = {}) => {
      if (filters.unread) return page(unread ? [conversation] : [], unread ? 1 : 0);
      return page();
    });
    vi.mocked(messagingApi.markConversationRead).mockImplementation(async () => {
      unread = false;
      return { ...conversation, unread_message_count: 0 };
    });
    renderApp();

    await waitFor(() => expect(messagingApi.fetchConversations).toHaveBeenCalledWith({}));
    fireEvent.click(screen.getAllByRole('button', { name: 'Messages' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Unread' }));
    await waitFor(() => expect(messagingApi.fetchConversations).toHaveBeenCalledWith({ unread: true }));
    const conversationButton = await screen.findByRole('button', { name: /\+21699887766/ });
    fireEvent.click(conversationButton);
    await screen.findByRole('button', { name: 'Back to messages' });
    fireEvent.click(screen.getByRole('button', { name: 'Back to messages' }));

    await waitFor(() => expect(screen.getByText(/No conversations match this view/)).toBeInTheDocument());
  });
});
