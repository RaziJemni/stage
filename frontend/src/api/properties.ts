import { apiRequest } from '../auth/api';
import type { Property } from '../data/mockData';

export interface ApiProperty {
  id: string;
  company_id: string;
  name: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country_code: string;
  timezone: string;
  max_guests?: number | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  wifi_network?: string | null;
  wifi_password?: string | null;
  parking_info?: string | null;
  amenities?: Record<string, unknown> | unknown[] | null;
  house_rules?: string | null;
  emergency_contact?: string | null;
  directions?: string | null;
  external_booking_url?: string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  status: 'active' | 'archived';
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiPropertyPage {
  items: ApiProperty[];
  page: number;
  page_size: number;
  total: number;
  pages: number;
}

export interface PropertyCreatePayload {
  name: string;
  owner_id?: string | null;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postal_code?: string;
  country_code?: string;
  timezone?: string;
  max_guests?: number;
  check_in_time?: string;
  check_out_time?: string;
  wifi_network?: string;
  wifi_password?: string;
  parking_info?: string;
  house_rules?: string;
  emergency_contact?: string;
  directions?: string;
  external_booking_url?: string;
}

export interface PropertyUpdatePayload {
  name?: string;
  owner_id?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country_code?: string | null;
  timezone?: string | null;
  max_guests?: number | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  wifi_network?: string | null;
  wifi_password?: string | null;
  parking_info?: string | null;
  house_rules?: string | null;
  emergency_contact?: string | null;
  directions?: string | null;
  external_booking_url?: string | null;
}

export function mapApiPropertyToProperty(apiProp: ApiProperty): Property & { _apiRaw?: ApiProperty } {
  const rulesArray = apiProp.house_rules
    ? apiProp.house_rules.split('\n').map((r) => r.trim()).filter(Boolean)
    : [];

  return {
    id: apiProp.id,
    name: apiProp.name,
    location: apiProp.address_line1 || (apiProp.city ? `${apiProp.city} Area` : 'Unspecified Location'),
    city: apiProp.city || 'Unspecified',
    bedrooms: undefined as any,
    bathrooms: undefined as any,
    maxGuests: apiProp.max_guests ?? 0,
    nightlyRateTND: undefined as any,
    status: apiProp.status === 'archived' ? 'Maintenance' : 'Available',
    imageUrl: '', // No fake Unsplash images for persistent backend properties
    rating: undefined as any,
    wifiSSID: apiProp.wifi_network || '',
    wifiPass: apiProp.wifi_password || '',
    doorCode: '', // Access codes are never fabricated
    checkInTime: apiProp.check_in_time ? apiProp.check_in_time.slice(0, 5) : '',
    checkOutTime: apiProp.check_out_time ? apiProp.check_out_time.slice(0, 5) : '',
    trashSchedule: apiProp.parking_info || '',
    houseRules: rulesArray,
    emergencyContact: apiProp.emergency_contact || '',
    ownerId: apiProp.owner_id || null,
    ownerName: apiProp.owner_name || null,
    _apiRaw: apiProp,
  };
}

export async function fetchProperties(params: {
  page?: number;
  page_size?: number;
  city?: string;
  include_archived?: boolean;
} = {}): Promise<ApiPropertyPage> {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.page_size) search.set('page_size', String(params.page_size));
  if (params.city && params.city !== 'All') search.set('city', params.city);
  if (params.include_archived) search.set('include_archived', 'true');

  const queryStr = search.toString();
  const path = `/api/v1/properties${queryStr ? `?${queryStr}` : ''}`;
  return apiRequest<ApiPropertyPage>(path);
}

export async function fetchAllActiveProperties(): Promise<ApiProperty[]> {
  const first = await fetchProperties({ page: 1, page_size: 100 });
  if (first.pages <= 1) return first.items.filter((property) => property.status === 'active');

  const remaining = await Promise.all(
    Array.from({ length: first.pages - 1 }, (_, index) =>
      fetchProperties({ page: index + 2, page_size: 100 })
    )
  );
  return [first.items, ...remaining.map((page) => page.items)]
    .flat()
    .filter((property) => property.status === 'active');
}

export async function fetchPropertyById(propertyId: string): Promise<ApiProperty> {
  return apiRequest<ApiProperty>(`/api/v1/properties/${propertyId}`);
}

export async function createProperty(payload: PropertyCreatePayload): Promise<ApiProperty> {
  return apiRequest<ApiProperty>('/api/v1/properties', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProperty(
  propertyId: string,
  payload: PropertyUpdatePayload
): Promise<ApiProperty> {
  return apiRequest<ApiProperty>(`/api/v1/properties/${propertyId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function archiveProperty(propertyId: string): Promise<ApiProperty> {
  return apiRequest<ApiProperty>(`/api/v1/properties/${propertyId}/archive`, {
    method: 'POST',
  });
}

export async function unarchiveProperty(propertyId: string): Promise<ApiProperty> {
  return apiRequest<ApiProperty>(`/api/v1/properties/${propertyId}/unarchive`, {
    method: 'POST',
  });
}
