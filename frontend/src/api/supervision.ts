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
  occupancy_rate: number;
}

export interface PortfolioAnalytics {
  window_days: number;
  start_date: string;
  end_date: string;
  total_properties: number;
  occupancy_rate: number;
  total_booked_nights: number;
  total_reservations: number;
  average_length_of_stay: number;
  channel_distribution: ChannelMetric[];
  property_insights: PropertyOccupancyInsight[];
}

export async function fetchPortfolioAnalytics(windowDays = 30): Promise<PortfolioAnalytics> {
  return apiRequest<PortfolioAnalytics>(`/api/v1/supervision/analytics?window_days=${windowDays}`);
}

