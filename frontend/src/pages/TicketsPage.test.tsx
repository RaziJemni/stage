import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TicketsPage } from './TicketsPage';

const property = { id: 'property-1', name: 'Villa Yasmine' } as any;
const suggestion = { id: 'suggestion-1', property_id: 'property-1', booking_id: null, conversation_id: null, title: 'Leaking sink', description: 'Guest reports a leak.', category: 'plumbing', priority: 'high', status: 'pending', created_at: '2026-08-18T10:00:00Z' } as const;

describe('TicketsPage', () => {
  const props = { tickets: [], suggestions: [], properties: [property], loading: false, error: null, onRetry: vi.fn(), onCreate: vi.fn().mockResolvedValue(undefined), onConfirm: vi.fn().mockResolvedValue(undefined), onReject: vi.fn().mockResolvedValue(undefined) };
  it('shows empty and retryable failure states', () => { const { rerender } = render(<TicketsPage {...props} />); expect(screen.getByText(/No maintenance tickets yet/)).toBeInTheDocument(); rerender(<TicketsPage {...props} error="Unable to reach the API." />); fireEvent.click(screen.getByRole('button', { name: 'Try again' })); expect(props.onRetry).toHaveBeenCalled(); });
  it('creates a ticket using the selected property', () => { render(<TicketsPage {...props} />); fireEvent.click(screen.getByRole('button', { name: 'Create ticket' })); fireEvent.change(screen.getByLabelText('Property'), { target: { value: 'property-1' } }); fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Broken AC' } }); fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'AC is not cooling.' } }); fireEvent.click(screen.getAllByRole('button', { name: 'Create ticket' })[1]); expect(props.onCreate).toHaveBeenCalledWith(expect.objectContaining({ property_id: 'property-1', title: 'Broken AC' })); });
  it('lets staff confirm or reject a suggestion', () => { render(<TicketsPage {...props} suggestions={[suggestion]} />); fireEvent.click(screen.getByRole('button', { name: 'Confirm ticket' })); expect(props.onConfirm).toHaveBeenCalledWith(suggestion); fireEvent.click(screen.getByRole('button', { name: 'Reject' })); expect(props.onReject).toHaveBeenCalledWith('suggestion-1'); });
});
