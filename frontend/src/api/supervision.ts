import { apiRequest } from '../auth/api';

export interface ChannelMetric {
  channel: string;
  channel_key: string;
  count: number;
  nights: number;
  percentage: number;
}

export interface PropertyOccupancyInsight {
  property_id: string;
  property_name: string;
  booked_nights: number;
  available_nights?: number;
  blocked_nights?: number;
  occupancy_rate: number;
}

export interface PortfolioAnalytics {
  window_days: number;
  start_date: string;
  end_date: string;
  property_id?: string | null;
  total_properties: number;
  occupancy_rate: number;
  total_booked_nights: number;
  total_available_nights?: number;
  total_blocked_nights?: number;
  total_reservations: number;
  average_length_of_stay: number;
  channel_distribution: ChannelMetric[];
  property_insights: PropertyOccupancyInsight[];
}

export async function fetchPortfolioAnalytics(windowDays = 30, propertyId?: string): Promise<PortfolioAnalytics> {
  const params = new URLSearchParams({ window_days: String(windowDays) });
  if (propertyId) {
    params.set('property_id', propertyId);
  }
  return apiRequest<PortfolioAnalytics>(`/api/v1/supervision/analytics?${params.toString()}`);
}

