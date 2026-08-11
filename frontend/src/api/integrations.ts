import { apiRequest } from '../auth/api';

export type WhatsappMode = 'simulator' | 'test' | 'production';
export type WhatsappHealthStatus = 'simulator' | 'test' | 'unconfigured';

export interface WhatsappIntegrationHealth {
  integration: 'whatsapp';
  mode: WhatsappMode;
  health_status: WhatsappHealthStatus;
  detail: string;
}

export async function fetchWhatsappIntegrationHealth(): Promise<WhatsappIntegrationHealth> {
  return apiRequest<WhatsappIntegrationHealth>('/api/v1/integrations/whatsapp/health');
}
