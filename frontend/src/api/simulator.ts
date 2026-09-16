import { apiRequest } from '../auth/api';

export interface SimulatorProperty {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  headline?: string | null;
}

export interface SimulatorMessage {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  sender_type: 'guest' | 'system' | 'staff';
  content: string;
  delivery_status: string;
  created_at: string;
}

export interface SimulatorSendResponse {
  message_id: string;
  conversation_id: string;
  created: boolean;
  created_at: string;
}

export async function fetchSimulatorProperties(): Promise<SimulatorProperty[]> {
  return apiRequest<SimulatorProperty[]>('/api/v1/integrations/whatsapp/simulator/chat/properties');
}

export async function fetchSimulatorMessages(
  propertyId: string,
  guestPhone: string
): Promise<SimulatorMessage[]> {
  const params = new URLSearchParams({
    property_id: propertyId,
    guest_phone: guestPhone.trim(),
  });
  return apiRequest<SimulatorMessage[]>(
    `/api/v1/integrations/whatsapp/simulator/chat/messages?${params.toString()}`
  );
}

export async function sendSimulatorMessage(
  propertyId: string,
  guestPhone: string,
  content: string
): Promise<SimulatorSendResponse> {
  return apiRequest<SimulatorSendResponse>('/api/v1/integrations/whatsapp/simulator/chat/send', {
    method: 'POST',
    body: JSON.stringify({
      property_id: propertyId,
      guest_phone: guestPhone.trim(),
      content: content.trim(),
    }),
  });
}
