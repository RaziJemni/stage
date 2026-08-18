import { apiRequest } from '../auth/api';

export type ConversationStatus = 'open' | 'closed';
export type HandlingMode = 'automatic' | 'manual';
export type DeliveryStatus = 'received' | 'queued' | 'sent' | 'delivered' | 'failed';
export type SenderType = 'guest' | 'chatbot' | 'staff' | 'system';

export interface ApiConversation {
  id: string;
  property_id: string;
  guest_contact_identifier: string;
  status: ConversationStatus;
  handling_mode: HandlingMode;
  last_message_at: string | null;
  last_message_sender_type: SenderType | null;
  escalation_reason: string | null;
  unread_message_count: number;
}

export interface ApiMessage {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  sender_type: SenderType;
  content: string;
  delivery_status: DeliveryStatus;
  automatically_sent: boolean;
  created_at: string;
}

interface ApiPage<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  pages: number;
}

export async function fetchConversations(filters: { unread?: boolean; handling_mode?: HandlingMode } = {}): Promise<ApiPage<ApiConversation>> {
  const params = new URLSearchParams();
  if (filters.unread) params.set('unread', 'true');
  if (filters.handling_mode) params.set('handling_mode', filters.handling_mode);
  return apiRequest<ApiPage<ApiConversation>>(`/api/v1/conversations${params.size ? `?${params}` : ''}`);
}

export async function markConversationRead(conversationId: string): Promise<ApiConversation> {
  return apiRequest<ApiConversation>(`/api/v1/conversations/${conversationId}/read`, { method: 'POST' });
}

export async function fetchMessages(conversationId: string): Promise<ApiMessage[]> {
  return apiRequest<ApiMessage[]>(`/api/v1/conversations/${conversationId}/messages`);
}

export async function sendStaffMessage(conversationId: string, content: string): Promise<ApiMessage> {
  return apiRequest<ApiMessage>(`/api/v1/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function updateHandlingMode(
  conversationId: string,
  handlingMode: HandlingMode,
): Promise<ApiConversation> {
  return apiRequest<ApiConversation>(`/api/v1/conversations/${conversationId}/handling-mode`, {
    method: 'PATCH',
    body: JSON.stringify({ handling_mode: handlingMode }),
  });
}
