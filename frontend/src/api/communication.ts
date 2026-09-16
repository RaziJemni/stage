import { apiRequest } from '../auth/api';

export interface ReviewRequestItem {
  booking_id: string;
  property_id: string;
  property_name: string;
  guest_name: string;
  guest_contact: string;
  status: 'sent' | 'skipped' | string;
  skip_reason: string | null;
  language: string;
  sent_at: string | null;
}

export interface ReviewSequenceRunResult {
  processed_count: number;
  sent_count: number;
  skipped_count: number;
  evaluations: ReviewRequestItem[];
}

export async function triggerReviewRequests(): Promise<ReviewSequenceRunResult> {
  return apiRequest<ReviewSequenceRunResult>('/api/v1/communication/review-requests/trigger', {
    method: 'POST',
  });
}

export async function fetchReviewRequestHistory(): Promise<ReviewRequestItem[]> {
  return apiRequest<ReviewRequestItem[]>('/api/v1/communication/review-requests');
}

