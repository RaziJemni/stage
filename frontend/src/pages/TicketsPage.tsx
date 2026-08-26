import { useState, type FormEvent, type ReactNode } from 'react';
import type { ApiContractor, ApiTicket, ApiTicketStatusHistory, ApiTicketSuggestion, TicketFilters, TicketPriority, TicketStatus } from '../api/maintenance';
import type { Property } from '../data/mockData';

interface Props {
  tickets: ApiTicket[]; suggestions: ApiTicketSuggestion[]; properties: Property[]; contractors: ApiContractor[];
  loading: boolean; error: string | null; onRetry: () => void;
  onCreate: (input: { property_id: string; title: string; description: string; priority: TicketPriority }) => Promise<void>;
  onConfirm: (suggestion: ApiTicketSuggestion) => Promise<void>; onReject: (id: string) => Promise<void>;
  onCreateContractor: (input: { name: string; phone?: string; specialty?: string; notes?: string }) => Promise<void>;
  onUpdateContractor: (id: string, input: { name: string; phone?: string; specialty?: string; notes?: string }) => Promise<void>;
  onDeactivateContractor: (id: string) => Promise<void>; onAssignContractor: (ticketId: string, contractorId: string) => Promise<void>;
  filters: TicketFilters; onFiltersChange: (filters: TicketFilters) => void;
  statusHistories: Record<string, ApiTicketStatusHistory[]>; onLoadStatusHistory: (ticketId: string) => Promise<void>;
  onUpdateStatus: (ticketId: string, status: TicketStatus, note?: string) => Promise<void>;
  onSendGuestUpdate?: (ticketId: string, content: string) => Promise<void>;
}

const statusLabel = (status: TicketStatus) => status.replace('_', ' ');
const terminal = new Set<TicketStatus>(['resolved', 'cancelled']);

export function TicketsPage({ tickets, suggestions, properties, contractors, loading, error, onRetry, onCreate, onConfirm, onReject, onCreateContractor, onUpdateContractor, onDeactivateContractor, onAssignContractor, filters, onFiltersChange, statusHistories, onLoadStatusHistory, onUpdateStatus, onSendGuestUpdate }: Props) {
  const [ticketFormOpen, setTicketFormOpen] = useState(false); const [contractorFormOpen, setContractorFormOpen] = useState(false); const [editingContractor, setEditingContractor] = useState<ApiContractor | null>(null);
  const [guestUpdateModalTicket, setGuestUpdateModalTicket] = useState<ApiTicket | null>(null);
  const [guestUpdateContent, setGuestUpdateContent] = useState('');
  const [guestUpdateSuccess, setGuestUpdateSuccess] = useState<string | null>(null);
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [propertyId, setPropertyId] = useState(''); const [priority, setPriority] = useState<TicketPriority>('medium');
  const [contractorName, setContractorName] = useState(''); const [contractorPhone, setContractorPhone] = useState(''); const [contractorSpecialty, setContractorSpecialty] = useState(''); const [contractorNotes, setContractorNotes] = useState('');
  const [saving, setSaving] = useState(false); const [actionError, setActionError] = useState<string | null>(null); const [selectedContractors, setSelectedContractors] = useState<Record<string, string>>({}); const [statusNotes, setStatusNotes] = useState<Record<string, string>>({}); const [shownHistory, setShownHistory] = useState<Record<string, boolean>>({});
  const activeContractors = contractors.filter((contractor) => contractor.is_active);
  const propertyName = (id: string) => properties.find((property) => property.id === id)?.name ?? 'Property unavailable';
  const resetTicket = () => { setTicketFormOpen(false); setTitle(''); setDescription(''); setPropertyId(''); };
  const resetContractor = () => { setEditingContractor(null); setContractorName(''); setContractorPhone(''); setContractorSpecialty(''); setContractorNotes(''); };
  const fail = (err: any, fallback: string) => setActionError(err.message || fallback);
  const submitTicket = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setActionError(null); try { await onCreate({ property_id: propertyId, title, description, priority }); resetTicket(); } catch (err) { fail(err, 'Unable to create the ticket. Try again.'); } finally { setSaving(false); } };
  const submitContractor = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setActionError(null); const input = { name: contractorName, phone: contractorPhone || undefined, specialty: contractorSpecialty || undefined, notes: contractorNotes || undefined }; try { if (editingContractor) await onUpdateContractor(editingContractor.id, input); else await onCreateContractor(input); resetContractor(); setContractorFormOpen(false); } catch (err) { fail(err, 'Unable to save the contractor. Try again.'); } finally { setSaving(false); } };
  const editContractor = (contractor: ApiContractor) => { setEditingContractor(contractor); setContractorName(contractor.name); setContractorPhone(contractor.phone || ''); setContractorSpecialty(contractor.specialty || ''); setContractorNotes(contractor.notes || ''); setContractorFormOpen(true); };
  const assign = async (ticketId: string) => { const contractorId = selectedContractors[ticketId]; if (!contractorId) { setActionError('Select an active contractor before assigning this ticket.'); return; } setSaving(true); setActionError(null); try { await onAssignContractor(ticketId, contractorId); } catch (err) { fail(err, 'Unable to assign this contractor. Try again.'); } finally { setSaving(false); } };
  const transition = async (ticketId: string, status: TicketStatus) => { if (status === 'cancelled' && !window.confirm('Cancel this ticket? This cannot be undone.')) return; setSaving(true); setActionError(null); try { await onUpdateStatus(ticketId, status, statusNotes[ticketId]); } catch (err) { fail(err, 'Unable to update the ticket status. Try again.'); } finally { setSaving(false); } };
  const toggleHistory = async (ticketId: string) => { try { setActionError(null); if (!shownHistory[ticketId]) await onLoadStatusHistory(ticketId); setShownHistory((current) => ({ ...current, [ticketId]: !current[ticketId] })); } catch (err) { fail(err, 'Unable to load ticket history. Try again.'); } };

  const getTemplate = (ticket: ApiTicket, type: 'assigned' | 'in_progress' | 'resolved' | 'custom') => {
    switch (type) {
      case 'assigned':
        return `Update regarding "${ticket.title}": A technician has been assigned to address this maintenance request.`;
      case 'in_progress':
        return `Update regarding "${ticket.title}": Maintenance work is currently in progress.`;
      case 'resolved':
        return `Update regarding "${ticket.title}": The maintenance issue has been resolved. Please let us know if everything is to your satisfaction.`;
      default:
        return `Update regarding "${ticket.title}": `;
    }
  };

  const openGuestUpdateModal = (ticket: ApiTicket) => {
    setActionError(null);
    setGuestUpdateSuccess(null);
    setGuestUpdateModalTicket(ticket);
    const initialType = ticket.status === 'resolved' ? 'resolved' : ticket.status === 'in_progress' ? 'in_progress' : ticket.status === 'assigned' ? 'assigned' : 'custom';
    setGuestUpdateContent(getTemplate(ticket, initialType));
  };

  const submitGuestUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!guestUpdateModalTicket || !onSendGuestUpdate) return;
    setSaving(true);
    setActionError(null);
    try {
      await onSendGuestUpdate(guestUpdateModalTicket.id, guestUpdateContent);
      setGuestUpdateSuccess('Update message queued for guest in conversation.');
      setGuestUpdateModalTicket(null);
      setGuestUpdateContent('');
    } catch (err) {
      fail(err, 'Unable to send guest update. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
    <header className="flex flex-col gap-4 border-b border-[#EBE6DD] pb-6 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-[#0F3D5E]">Maintenance · {tickets.length} tickets</p><h1 className="mt-1 text-2xl font-bold text-[#1C1B18]">Property Maintenance</h1><p className="text-sm text-[#78716C]">Track issues and the contractor contact handling each ticket.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { resetContractor(); setContractorFormOpen(true); }} className="rounded-xl border border-[#0F3D5E] px-4 py-2.5 text-xs font-bold text-[#0F3D5E]">Add contractor</button><button type="button" onClick={() => setTicketFormOpen(true)} className="rounded-xl bg-[#0F3D5E] px-4 py-2.5 text-xs font-bold text-white">Create ticket</button></div></header>
    {guestUpdateSuccess && <section role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{guestUpdateSuccess}</section>}
    {(error || actionError) && <section role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error || actionError} {error && <button type="button" className="font-bold underline" onClick={onRetry}>Try again</button>}</section>}
    {loading && <p className="rounded-xl border border-[#EBE6DD] bg-white p-5 text-sm text-[#78716C]">Loading maintenance work...</p>}
    {!loading && !error && <section aria-label="Maintenance filters" className="grid gap-3 rounded-2xl border border-[#EBE6DD] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"><Filter label="Property" value={filters.property_id || ''} onChange={(value) => onFiltersChange({ ...filters, property_id: value || undefined })}><option value="">All properties</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</Filter><Filter label="Priority" value={filters.priority || ''} onChange={(value) => onFiltersChange({ ...filters, priority: (value || undefined) as TicketPriority | undefined })}><option value="">All priorities</option>{['low', 'medium', 'high', 'urgent'].map((item) => <option key={item} value={item}>{item}</option>)}</Filter><Filter label="Status" value={filters.status || ''} onChange={(value) => onFiltersChange({ ...filters, status: (value || undefined) as TicketStatus | undefined })}><option value="">All statuses</option>{['open', 'assigned', 'in_progress', 'resolved', 'cancelled'].map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}</Filter><Filter label="Contractor" value={filters.contractor_id || ''} onChange={(value) => onFiltersChange({ ...filters, contractor_id: value || undefined })}><option value="">Any contractor</option>{contractors.map((contractor) => <option key={contractor.id} value={contractor.id}>{contractor.name}</option>)}</Filter></section>}
    {!loading && !error && <section className="rounded-2xl border border-[#EBE6DD] bg-white p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-[#1C1B18]">Contractor contacts</h2><p className="text-sm text-[#78716C]">Contacts only — contractors do not sign in to Vayca.</p></div><span className="rounded-full bg-[#F0F6FA] px-2 py-1 text-xs font-bold text-[#0F3D5E]">{activeContractors.length} active</span></div>{contractors.length === 0 ? <p className="mt-4 text-sm text-[#78716C]">No contractor contacts yet. Add one before assigning work.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{contractors.map((contractor) => <article key={contractor.id} className="rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] p-3"><div className="flex items-start justify-between gap-2"><div><h3 className="font-bold text-[#1C1B18]">{contractor.name}</h3><p className="text-xs text-[#78716C]">{contractor.specialty || 'No specialty recorded'}</p></div><span className="text-xs font-semibold text-[#78716C]">{contractor.is_active ? 'Active' : 'Inactive'}</span></div>{contractor.phone && <p className="mt-2 text-sm text-[#3B3735]">{contractor.phone}</p>}<div className="mt-3 flex gap-3"><button type="button" disabled={saving} onClick={() => editContractor(contractor)} className="text-xs font-bold text-[#0F3D5E] underline">Edit contact</button>{contractor.is_active && <button type="button" disabled={saving} onClick={() => void onDeactivateContractor(contractor.id)} className="text-xs font-bold text-[#C25730] underline">Deactivate contact</button>}</div></article>)}</div>}</section>}
    {!loading && !error && suggestions.length > 0 && <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><h2 className="font-bold text-[#1C1B18]">Chatbot suggestions need staff confirmation</h2>{suggestions.map((suggestion) => <article key={suggestion.id} className="rounded-xl border border-amber-200 bg-white p-4"><p className="font-bold">{suggestion.title}</p><p className="mt-1 text-sm text-[#3B3735]">{suggestion.description}</p><p className="mt-2 text-xs text-[#78716C]">{propertyName(suggestion.property_id)} · {suggestion.priority}</p><div className="mt-3 flex gap-2"><button type="button" className="rounded-lg bg-[#0F3D5E] px-3 py-2 text-xs font-bold text-white" onClick={() => void onConfirm(suggestion)}>Confirm ticket</button><button type="button" className="rounded-lg border border-[#EBE6DD] px-3 py-2 text-xs font-bold" onClick={() => void onReject(suggestion.id)}>Reject</button></div></article>)}</section>}
    {!loading && !error && tickets.length === 0 && suggestions.length === 0 && <p className="rounded-xl border border-[#EBE6DD] bg-white p-8 text-center text-sm text-[#78716C]">No maintenance tickets match these filters.</p>}
    {!loading && !error && tickets.length > 0 && <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} propertyName={propertyName(ticket.property_id)} activeContractors={activeContractors} selectedContractor={selectedContractors[ticket.id] || ''} onSelectedContractor={(value) => setSelectedContractors((current) => ({ ...current, [ticket.id]: value }))} onAssign={() => void assign(ticket.id)} statusNote={statusNotes[ticket.id] || ''} onStatusNote={(value) => setStatusNotes((current) => ({ ...current, [ticket.id]: value }))} onTransition={(status) => void transition(ticket.id, status)} saving={saving} history={statusHistories[ticket.id] || []} historyShown={Boolean(shownHistory[ticket.id])} onToggleHistory={() => void toggleHistory(ticket.id)} onOpenGuestUpdate={() => openGuestUpdateModal(ticket)} />)}</section>}
    {ticketFormOpen && <Modal title="Create maintenance ticket"><form onSubmit={(event) => void submitTicket(event)} className="space-y-3"><label className="block text-sm font-semibold">Property<select required value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className="mt-1 w-full rounded-lg border p-2"><option value="">Select property</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label><label className="block text-sm font-semibold">Title<input required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><label className="block text-sm font-semibold">Description<textarea required value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><label className="block text-sm font-semibold">Priority<select value={priority} onChange={(event) => setPriority(event.target.value as TicketPriority)} className="mt-1 w-full rounded-lg border p-2"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label><ModalActions onCancel={resetTicket} saving={saving} label="Create ticket" /></form></Modal>}
    {contractorFormOpen && <Modal title={editingContractor ? 'Edit contractor contact' : 'Add contractor contact'}><form onSubmit={(event) => void submitContractor(event)} className="space-y-3"><label className="block text-sm font-semibold">Name<input required value={contractorName} onChange={(event) => setContractorName(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><label className="block text-sm font-semibold">Phone<input value={contractorPhone} onChange={(event) => setContractorPhone(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><label className="block text-sm font-semibold">Specialty<input value={contractorSpecialty} onChange={(event) => setContractorSpecialty(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><label className="block text-sm font-semibold">Notes<textarea value={contractorNotes} onChange={(event) => setContractorNotes(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><ModalActions onCancel={() => { resetContractor(); setContractorFormOpen(false); }} saving={saving} label="Save contact" /></form></Modal>}
    {guestUpdateModalTicket && <Modal title="Send guest update (FR-TKT-08)"><form onSubmit={(event) => void submitGuestUpdate(event)} className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold text-[#78716C]">Approved message templates:</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setGuestUpdateContent(getTemplate(guestUpdateModalTicket, 'assigned'))} className="rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] px-2.5 py-1 text-xs font-semibold text-[#0F3D5E] hover:bg-[#F0F6FA]">Assigned</button>
          <button type="button" onClick={() => setGuestUpdateContent(getTemplate(guestUpdateModalTicket, 'in_progress'))} className="rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] px-2.5 py-1 text-xs font-semibold text-[#0F3D5E] hover:bg-[#F0F6FA]">In progress</button>
          <button type="button" onClick={() => setGuestUpdateContent(getTemplate(guestUpdateModalTicket, 'resolved'))} className="rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] px-2.5 py-1 text-xs font-semibold text-[#0F3D5E] hover:bg-[#F0F6FA]">Resolved</button>
        </div>
      </div>
      <label className="block text-sm font-semibold">Review update message<textarea required aria-label="Guest update message" rows={4} value={guestUpdateContent} onChange={(event) => setGuestUpdateContent(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" placeholder="Type or edit update for the guest..." /></label>
      <ModalActions onCancel={() => { setGuestUpdateModalTicket(null); setGuestUpdateContent(''); }} saving={saving} label="Send update" />
    </form></Modal>}
  </div>;
}

function TicketCard({ ticket, propertyName, activeContractors, selectedContractor, onSelectedContractor, onAssign, statusNote, onStatusNote, onTransition, saving, history, historyShown, onToggleHistory, onOpenGuestUpdate }: { ticket: ApiTicket; propertyName: string; activeContractors: ApiContractor[]; selectedContractor: string; onSelectedContractor: (value: string) => void; onAssign: () => void; statusNote: string; onStatusNote: (value: string) => void; onTransition: (status: TicketStatus) => void; saving: boolean; history: ApiTicketStatusHistory[]; historyShown: boolean; onToggleHistory: () => void; onOpenGuestUpdate: () => void; }) {
  return <article className="rounded-xl border border-[#EBE6DD] bg-white p-4">
    <div className="flex justify-between gap-2">
      <h2 className="font-bold text-[#1C1B18]">{ticket.title}</h2>
      <span className="rounded-full bg-[#FDF4F0] px-2 py-0.5 text-xs font-bold text-[#C25730]">{ticket.priority}</span>
    </div>
    <p className="mt-2 text-sm text-[#3B3735]">{ticket.description}</p>
    <p className="mt-3 text-xs text-[#78716C]">{propertyName} · <span className="font-semibold">{statusLabel(ticket.status)}</span></p>
    {ticket.conversation_id && (
      <div className="mt-3 flex items-center justify-between rounded-lg bg-[#F0F6FA] px-3 py-2 text-xs">
        <span className="font-semibold text-[#0F3D5E]">💬 Linked conversation</span>
        <button type="button" onClick={onOpenGuestUpdate} className="font-bold text-[#0F3D5E] underline hover:text-[#0a273c]">Send guest update</button>
      </div>
    )}
    {!terminal.has(ticket.status) && (
      <div className="mt-4 space-y-2 border-t border-[#EBE6DD] pt-3">
        {ticket.status === 'open' && (
          <>
            <label className="block text-xs font-bold text-[#3B3735]">Assign contractor
              <select aria-label={`Contractor for ${ticket.title}`} value={selectedContractor} onChange={(event) => onSelectedContractor(event.target.value)} className="mt-1 w-full rounded-lg border border-[#DDD7CC] bg-white p-2 text-sm">
                <option value="">Select active contractor</option>
                {activeContractors.map((contractor) => <option key={contractor.id} value={contractor.id}>{contractor.name}</option>)}
              </select>
            </label>
            <button type="button" disabled={saving || activeContractors.length === 0} onClick={onAssign} className="w-full rounded-lg bg-[#0F3D5E] p-2 text-xs font-bold text-white disabled:opacity-60">Assign contractor</button>
          </>
        )}
        <label className="block text-xs font-bold text-[#3B3735]">Status note (optional)
          <textarea aria-label={`Status note for ${ticket.title}`} value={statusNote} onChange={(event) => onStatusNote(event.target.value)} className="mt-1 w-full rounded-lg border border-[#DDD7CC] p-2 text-sm" />
        </label>
        {ticket.status === 'assigned' && <button type="button" disabled={saving} onClick={() => onTransition('in_progress')} className="w-full rounded-lg bg-[#0F3D5E] p-2 text-xs font-bold text-white">Start work</button>}
        {ticket.status === 'in_progress' && <button type="button" disabled={saving} onClick={() => onTransition('resolved')} className="w-full rounded-lg bg-[#0F3D5E] p-2 text-xs font-bold text-white">Mark resolved</button>}
        <button type="button" disabled={saving} onClick={() => onTransition('cancelled')} className="w-full rounded-lg border border-[#C25730] p-2 text-xs font-bold text-[#C25730]">Cancel ticket</button>
      </div>
    )}
    <button type="button" onClick={onToggleHistory} className="mt-4 text-xs font-bold text-[#0F3D5E] underline">{historyShown ? 'Hide status history' : 'Show status history'}</button>
    {historyShown && <ol className="mt-3 space-y-2 border-t border-[#EBE6DD] pt-3 text-xs text-[#3B3735]">{history.map((entry) => <li key={entry.id}><strong>{entry.from_status ? `${statusLabel(entry.from_status)} → ` : ''}{statusLabel(entry.to_status)}</strong><br /><span className="text-[#78716C]">{new Date(entry.changed_at).toLocaleString()} · {entry.changed_by_user_id}</span>{entry.note && <p>{entry.note}</p>}</li>)}</ol>}
  </article>;
}
function Filter({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) { return <label className="text-xs font-bold text-[#3B3735]">{label}<select aria-label={`Filter by ${label.toLowerCase()}`} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-[#DDD7CC] bg-white p-2 text-sm">{children}</select></label>; }
function Modal({ title, children }: { title: string; children: ReactNode }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1B18]/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6"><h2 className="text-lg font-bold">{title}</h2><div className="mt-4">{children}</div></div></div>; }
function ModalActions({ onCancel, saving, label }: { onCancel: () => void; saving: boolean; label: string }) { return <div className="flex gap-2"><button type="button" onClick={onCancel} className="flex-1 rounded-lg border p-2">Cancel</button><button disabled={saving} className="flex-1 rounded-lg bg-[#0F3D5E] p-2 font-bold text-white">{saving ? 'Saving...' : label}</button></div>; }
