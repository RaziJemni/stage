import { apiRequest } from '../auth/api';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'cancelled';
export interface ApiTicket { id: string; property_id: string; booking_id: string | null; conversation_id: string | null; title: string; description: string; category: string | null; priority: TicketPriority; status: TicketStatus; created_by_user_id: string; suggested_by_chatbot: boolean; created_at: string; updated_at: string; }
export interface ApiTicketSuggestion { id: string; property_id: string; booking_id: string | null; conversation_id: string | null; title: string; description: string; category: string | null; priority: TicketPriority; status: 'pending' | 'confirmed' | 'rejected'; created_at: string; }
export interface ApiContractor { id: string; name: string; phone: string | null; specialty: string | null; notes: string | null; is_active: boolean; created_at: string; updated_at: string; }
export interface ApiTicketAssignment { id: string; ticket_id: string; contractor_id: string; assigned_by_user_id: string; assigned_at: string; ended_at: string | null; notes: string | null; }
interface Page<T> { items: T[]; page: number; page_size: number; total: number; pages: number; }
export async function fetchTickets(): Promise<Page<ApiTicket>> { return apiRequest<Page<ApiTicket>>('/api/v1/tickets'); }
export async function createTicket(payload: { property_id: string; title: string; description: string; category?: string; priority: TicketPriority }): Promise<ApiTicket> { return apiRequest<ApiTicket>('/api/v1/tickets', { method: 'POST', body: JSON.stringify(payload) }); }
export async function fetchTicketSuggestions(): Promise<Page<ApiTicketSuggestion>> { return apiRequest<Page<ApiTicketSuggestion>>('/api/v1/tickets/suggestions'); }
export async function confirmTicketSuggestion(suggestion: ApiTicketSuggestion): Promise<ApiTicketSuggestion> { return apiRequest<ApiTicketSuggestion>(`/api/v1/tickets/suggestions/${suggestion.id}/confirm`, { method: 'POST', body: JSON.stringify({ title: suggestion.title, description: suggestion.description, category: suggestion.category, priority: suggestion.priority }) }); }
export async function rejectTicketSuggestion(id: string): Promise<ApiTicketSuggestion> { return apiRequest<ApiTicketSuggestion>(`/api/v1/tickets/suggestions/${id}/reject`, { method: 'POST' }); }
export async function fetchContractors(includeInactive = false): Promise<Page<ApiContractor>> { return apiRequest<Page<ApiContractor>>(`/api/v1/contractors?include_inactive=${includeInactive}&page_size=100`); }
export async function createContractor(payload: { name: string; phone?: string; specialty?: string; notes?: string }): Promise<ApiContractor> { return apiRequest<ApiContractor>('/api/v1/contractors', { method: 'POST', body: JSON.stringify(payload) }); }
export async function updateContractor(id: string, payload: Partial<Pick<ApiContractor, 'name' | 'phone' | 'specialty' | 'notes' | 'is_active'>>): Promise<ApiContractor> { return apiRequest<ApiContractor>(`/api/v1/contractors/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }); }
export async function assignContractor(ticketId: string, contractorId: string, notes?: string): Promise<ApiTicketAssignment> { return apiRequest<ApiTicketAssignment>(`/api/v1/tickets/${ticketId}/assignments`, { method: 'POST', body: JSON.stringify({ contractor_id: contractorId, notes: notes || null }) }); }
