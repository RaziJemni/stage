import { apiRequest } from '../auth/api';

export interface ApiOwner {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  commission_percentage: number | string;
  notes: string | null;
  is_active: boolean;
  properties_count: number;
  created_at: string;
  updated_at: string;
}

export interface OwnerCreatePayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  commission_percentage?: number | string;
  notes?: string | null;
}

export interface OwnerUpdatePayload {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  commission_percentage?: number | string | null;
  notes?: string | null;
  is_active?: boolean | null;
}

export interface StatementBookingItem {
  booking_id: string;
  property_id: string;
  property_name: string;
  guest_name: string | null;
  source_type: string;
  check_in: string;
  check_out: string;
  total_amount: number | string;
  paid_amount: number | string;
  payment_status: string | null;
}

export interface StatementTicketItem {
  ticket_id: string;
  property_id: string;
  property_name: string;
  title: string;
  category: string | null;
  resolved_at: string | null;
  cost: number | string;
}

export interface OwnerStatementPropertySummary {
  property_id: string;
  property_name: string;
  bookings_count: number;
  gross_revenue: number | string;
  commission_percentage: number | string;
  commission_amount: number | string;
  maintenance_expenses: number | string;
  net_payout: number | string;
}

export interface OwnerMonthlyStatement {
  owner_id: string;
  owner_name: string;
  email: string | null;
  phone: string | null;
  commission_percentage: number | string;
  year: number;
  month: number;
  currency: string;
  properties_count: number;
  bookings_count: number;
  gross_revenue: number | string;
  commission_amount: number | string;
  maintenance_expenses: number | string;
  net_payout: number | string;
  properties: OwnerStatementPropertySummary[];
  bookings: StatementBookingItem[];
  maintenance_tickets: StatementTicketItem[];
}

export interface CompanyStatementsOverview {
  year: number;
  month: number;
  currency: string;
  total_properties: number;
  total_owners: number;
  total_gross_revenue: number | string;
  total_commission: number | string;
  total_maintenance_expenses: number | string;
  total_net_payout: number | string;
  statements: OwnerMonthlyStatement[];
}

export async function fetchOwners(includeInactive = false): Promise<ApiOwner[]> {
  const query = includeInactive ? '?include_inactive=true' : '';
  return apiRequest<ApiOwner[]>(`/api/v1/owners${query}`);
}

export async function createOwner(payload: OwnerCreatePayload): Promise<ApiOwner> {
  return apiRequest<ApiOwner>('/api/v1/owners', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateOwner(ownerId: string, payload: OwnerUpdatePayload): Promise<ApiOwner> {
  return apiRequest<ApiOwner>(`/api/v1/owners/${ownerId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteOwner(ownerId: string): Promise<void> {
  return apiRequest<void>(`/api/v1/owners/${ownerId}`, {
    method: 'DELETE',
  });
}

export async function fetchCompanyStatements(year?: number, month?: number): Promise<CompanyStatementsOverview> {
  const params = new URLSearchParams();
  if (year) params.set('year', String(year));
  if (month) params.set('month', String(month));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<CompanyStatementsOverview>(`/api/v1/supervision/owner-statements${qs}`);
}

export async function fetchOwnerStatement(ownerId: string, year?: number, month?: number): Promise<OwnerMonthlyStatement> {
  const params = new URLSearchParams();
  if (year) params.set('year', String(year));
  if (month) params.set('month', String(month));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<OwnerMonthlyStatement>(`/api/v1/supervision/owner-statements/${ownerId}${qs}`);
}

export function getExportStatementUrl(ownerId: string, year?: number, month?: number): string {
  const params = new URLSearchParams();
  if (year) params.set('year', String(year));
  if (month) params.set('month', String(month));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return `/api/v1/supervision/owner-statements/${ownerId}/export${qs}`;
}
