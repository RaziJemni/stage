import { useState, type FormEvent, type ReactNode } from 'react';
import type { ApiContractor, ApiTicket, ApiTicketStatusHistory, ApiTicketSuggestion, TicketFilters, TicketPriority, TicketStatus } from '../api/maintenance';
import type { Property } from '../data/mockData';
import { WorkstationHeader } from '../components/WorkstationHeader';
import { Plus, UserPlus, AlertCircle, Wrench, Phone, Clock, MessageSquare, CheckCircle2 } from 'lucide-react';

interface Props {
  tickets: ApiTicket[]; 
  suggestions: ApiTicketSuggestion[]; 
  properties: Property[]; 
  contractors: ApiContractor[];
  loading: boolean; 
  error: string | null; 
  onRetry: () => void;
  onCreate: (input: { property_id: string; title: string; description: string; priority: TicketPriority }) => Promise<void>;
  onConfirm: (suggestion: ApiTicketSuggestion) => Promise<void>; 
  onReject: (id: string) => Promise<void>;
  onCreateContractor: (input: { name: string; phone?: string; specialty?: string; notes?: string }) => Promise<void>;
  onUpdateContractor: (id: string, input: { name: string; phone?: string; specialty?: string; notes?: string }) => Promise<void>;
  onDeactivateContractor: (id: string) => Promise<void>; 
  onAssignContractor: (ticketId: string, contractorId: string) => Promise<void>;
  filters: TicketFilters; 
  onFiltersChange: (filters: TicketFilters) => void;
  statusHistories: Record<string, ApiTicketStatusHistory[]>; 
  onLoadStatusHistory: (ticketId: string) => Promise<void>;
  onUpdateStatus: (ticketId: string, status: TicketStatus, note?: string) => Promise<void>;
  onSendGuestUpdate?: (ticketId: string, content: string) => Promise<void>;
}

const statusLabel = (status: TicketStatus) => status.replace('_', ' ');
const terminal = new Set<TicketStatus>(['resolved', 'cancelled']);

export function TicketsPage({ 
  tickets, 
  suggestions, 
  properties, 
  contractors, 
  loading, 
  error, 
  onRetry, 
  onCreate, 
  onConfirm, 
  onReject, 
  onCreateContractor, 
  onUpdateContractor, 
  onDeactivateContractor, 
  onAssignContractor, 
  filters, 
  onFiltersChange, 
  statusHistories, 
  onLoadStatusHistory, 
  onUpdateStatus, 
  onSendGuestUpdate 
}: Props) {
  const [ticketFormOpen, setTicketFormOpen] = useState(false); 
  const [contractorFormOpen, setContractorFormOpen] = useState(false); 
  const [editingContractor, setEditingContractor] = useState<ApiContractor | null>(null);
  const [guestUpdateModalTicket, setGuestUpdateModalTicket] = useState<ApiTicket | null>(null);
  const [guestUpdateContent, setGuestUpdateContent] = useState('');
  const [guestUpdateSuccess, setGuestUpdateSuccess] = useState<string | null>(null);
  const [title, setTitle] = useState(''); 
  const [description, setDescription] = useState(''); 
  const [propertyId, setPropertyId] = useState(''); 
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [contractorName, setContractorName] = useState(''); 
  const [contractorPhone, setContractorPhone] = useState(''); 
  const [contractorSpecialty, setContractorSpecialty] = useState(''); 
  const [contractorNotes, setContractorNotes] = useState('');
  const [saving, setSaving] = useState(false); 
  const [actionError, setActionError] = useState<string | null>(null); 
  const [selectedContractors, setSelectedContractors] = useState<Record<string, string>>({}); 
  const [statusNotes, setStatusNotes] = useState<Record<string, string>>({}); 
  const [shownHistory, setShownHistory] = useState<Record<string, boolean>>({});

  const activeContractors = contractors.filter((contractor) => contractor.is_active);
  const propertyName = (id: string) => properties.find((property) => property.id === id)?.name ?? 'Property unavailable';
  const resetTicket = () => { setTicketFormOpen(false); setTitle(''); setDescription(''); setPropertyId(''); };
  const resetContractor = () => { setEditingContractor(null); setContractorName(''); setContractorPhone(''); setContractorSpecialty(''); setContractorNotes(''); };
  const fail = (err: any, fallback: string) => setActionError(err.message || fallback);

  const submitTicket = async (event: FormEvent) => { 
    event.preventDefault(); 
    setSaving(true); 
    setActionError(null); 
    try { 
      await onCreate({ property_id: propertyId, title, description, priority }); 
      resetTicket(); 
    } catch (err) { 
      fail(err, 'Unable to create the ticket. Try again.'); 
    } finally { 
      setSaving(false); 
    } 
  };

  const submitContractor = async (event: FormEvent) => { 
    event.preventDefault(); 
    setSaving(true); 
    setActionError(null); 
    const input = { name: contractorName, phone: contractorPhone || undefined, specialty: contractorSpecialty || undefined, notes: contractorNotes || undefined }; 
    try { 
      if (editingContractor) await onUpdateContractor(editingContractor.id, input); 
      else await onCreateContractor(input); 
      resetContractor(); 
      setContractorFormOpen(false); 
    } catch (err) { 
      fail(err, 'Unable to save the contractor. Try again.'); 
    } finally { 
      setSaving(false); 
    } 
  };

  const editContractor = (contractor: ApiContractor) => { 
    setEditingContractor(contractor); 
    setContractorName(contractor.name); 
    setContractorPhone(contractor.phone || ''); 
    setContractorSpecialty(contractor.specialty || ''); 
    setContractorNotes(contractor.notes || ''); 
    setContractorFormOpen(true); 
  };

  const assign = async (ticketId: string) => { 
    const contractorId = selectedContractors[ticketId]; 
    if (!contractorId) { 
      setActionError('Select an active contractor before assigning this ticket.'); 
      return; 
    } 
    setSaving(true); 
    setActionError(null); 
    try { 
      await onAssignContractor(ticketId, contractorId); 
    } catch (err) { 
      fail(err, 'Unable to assign this contractor. Try again.'); 
    } finally { 
      setSaving(false); 
    } 
  };

  const transition = async (ticketId: string, status: TicketStatus) => { 
    if (status === 'cancelled' && !window.confirm('Cancel this ticket? This cannot be undone.')) return; 
    setSaving(true); 
    setActionError(null); 
    try { 
      await onUpdateStatus(ticketId, status, statusNotes[ticketId]); 
    } catch (err) { 
      fail(err, 'Unable to update the ticket status. Try again.'); 
    } finally { 
      setSaving(false); 
    } 
  };

  const toggleHistory = async (ticketId: string) => { 
    try { 
      setActionError(null); 
      if (!shownHistory[ticketId]) await onLoadStatusHistory(ticketId); 
      setShownHistory((current) => ({ ...current, [ticketId]: !current[ticketId] })); 
    } catch (err) { 
      fail(err, 'Unable to load ticket history. Try again.'); 
    } 
  };

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

  const urgentCount = tickets.filter(t => t.priority === 'urgent').length;
  const inFieldCount = tickets.filter(t => t.status === 'assigned' || t.status === 'in_progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF8F5]">
      {/* Standardized 64px Header */}
      <WorkstationHeader
        section="Maintenance"
        title="Maintenance & Contractor Dispatch"
        subtitle={`${tickets.length} active work orders`}
        actions={
          <div className="flex items-center gap-2.5">
            <button 
              type="button" 
              onClick={() => { resetContractor(); setContractorFormOpen(true); }} 
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#EBE6DD] bg-white px-3 py-1.5 text-xs font-semibold text-[#3B3735] hover:bg-[#FAF8F5] transition-colors shadow-sm cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5 text-[#0F3D5E]" />
              <span>Add contractor</span>
            </button>
            <button 
              type="button" 
              onClick={() => setTicketFormOpen(true)} 
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#D96B43] hover:bg-[#C25730] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-white" />
              <span>Create ticket</span>
            </button>
          </div>
        }
      />

      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* KPI Strip */}
        <section className="bg-white border border-[#EBE6DD] rounded-xl p-3.5 shadow-sm grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#EBE6DD] text-xs">
          <div className="p-2 sm:px-4 flex flex-col justify-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">Urgent Triage</span>
            <span className={`text-xl font-extrabold mt-0.5 ${urgentCount > 0 ? 'text-[#D96B43]' : 'text-[#1C1B18]'}`}>
              {urgentCount}
            </span>
          </div>
          <div className="p-2 sm:px-4 flex flex-col justify-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">In Field / Progress</span>
            <span className="text-xl font-extrabold text-[#0F3D5E] mt-0.5">{inFieldCount}</span>
          </div>
          <div className="p-2 sm:px-4 flex flex-col justify-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">Active Contractors</span>
            <span className="text-xl font-extrabold text-[#1C1B18] mt-0.5">{activeContractors.length}</span>
          </div>
          <div className="p-2 sm:px-4 flex flex-col justify-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">Resolved</span>
            <span className="text-xl font-extrabold text-emerald-600 mt-0.5">{resolvedCount}</span>
          </div>
        </section>

        {guestUpdateSuccess && (
          <section role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 shadow-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{guestUpdateSuccess}</span>
          </section>
        )}

        {(error || actionError) && (
          <section role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error || actionError}</span>
            </div>
            {error && (
              <button type="button" className="font-bold underline text-rose-800 hover:text-rose-900" onClick={onRetry}>
                Try again
              </button>
            )}
          </section>
        )}

        {loading && (
          <div className="rounded-xl border border-[#EBE6DD] bg-white p-6 text-sm text-[#78716C] shadow-sm flex items-center gap-2">
            <Clock className="h-4 w-4 animate-spin text-[#0F3D5E]" />
            <span>Loading maintenance work...</span>
          </div>
        )}

        {!loading && !error && (
          <section aria-label="Maintenance filters" className="grid gap-3 rounded-xl border border-[#EBE6DD] bg-white p-3.5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
            <Filter label="Property" value={filters.property_id || ''} onChange={(value) => onFiltersChange({ ...filters, property_id: value || undefined })}>
              <option value="">All properties</option>
              {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
            </Filter>
            <Filter label="Priority" value={filters.priority || ''} onChange={(value) => onFiltersChange({ ...filters, priority: (value || undefined) as TicketPriority | undefined })}>
              <option value="">All priorities</option>
              {['low', 'medium', 'high', 'urgent'].map((item) => <option key={item} value={item}>{item}</option>)}
            </Filter>
            <Filter label="Status" value={filters.status || ''} onChange={(value) => onFiltersChange({ ...filters, status: (value || undefined) as TicketStatus | undefined })}>
              <option value="">All statuses</option>
              {['open', 'assigned', 'in_progress', 'resolved', 'cancelled'].map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}
            </Filter>
            <Filter label="Contractor" value={filters.contractor_id || ''} onChange={(value) => onFiltersChange({ ...filters, contractor_id: value || undefined })}>
              <option value="">Any contractor</option>
              {contractors.map((contractor) => <option key={contractor.id} value={contractor.id}>{contractor.name}</option>)}
            </Filter>
          </section>
        )}

        {/* Contractor Contacts Bar */}
        {!loading && !error && (
          <section className="rounded-xl border border-[#EBE6DD] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#EBE6DD]">
              <div>
                <h2 className="font-bold text-sm text-[#1C1B18] flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-[#0F3D5E]" />
                  <span>Contractor contacts</span>
                </h2>
                <p className="text-xs text-[#78716C] mt-0.5">Contacts only — contractors do not sign in to Vayca.</p>
              </div>
              <span className="rounded-full bg-[#F0F6FA] px-2.5 py-0.5 text-xs font-bold text-[#0F3D5E] border border-[#B6DAEA]">
                {activeContractors.length} active
              </span>
            </div>

            {contractors.length === 0 ? (
              <p className="mt-4 text-xs text-[#78716C] italic">No contractor contacts yet. Add one before assigning work.</p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {contractors.map((contractor) => (
                  <article key={contractor.id} className="rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] p-3 text-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-[#1C1B18]">{contractor.name}</h3>
                          <p className="text-[11px] text-[#78716C]">{contractor.specialty || 'General Trade'}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${contractor.is_active ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-gray-100 text-gray-600'}`}>
                          {contractor.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {contractor.phone && (
                        <p className="mt-2 text-xs text-[#3B3735] flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3 text-[#78716C]" />
                          {contractor.phone}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 flex gap-3 pt-2 border-t border-[#EBE6DD]">
                      <button type="button" disabled={saving} onClick={() => editContractor(contractor)} className="text-xs font-bold text-[#0F3D5E] hover:underline">
                        Edit contact
                      </button>
                      {contractor.is_active && (
                        <button type="button" disabled={saving} onClick={() => void onDeactivateContractor(contractor.id)} className="text-xs font-bold text-[#C25730] hover:underline">
                          Deactivate contact
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Chatbot Suggestions Requiring Staff Confirmation */}
        {!loading && !error && suggestions.length > 0 && (
          <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
            <h2 className="font-bold text-sm text-[#1C1B18] flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Chatbot suggestions need staff confirmation</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {suggestions.map((suggestion) => (
                <article key={suggestion.id} className="rounded-lg border border-amber-200 bg-white p-3.5 text-xs">
                  <div className="flex items-start justify-between">
                    <p className="font-bold text-[#1C1B18] text-sm">{suggestion.title}</p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#FDF4F0] text-[#D96B43]">
                      {suggestion.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#3B3735]">{suggestion.description}</p>
                  <p className="mt-2 text-[11px] text-[#78716C]">{propertyName(suggestion.property_id)}</p>
                  <div className="mt-3 flex gap-2 pt-2 border-t border-[#EBE6DD]">
                    <button type="button" className="rounded-lg bg-[#0F3D5E] hover:bg-[#0C324E] px-3 py-1.5 text-xs font-bold text-white shadow-xs" onClick={() => void onConfirm(suggestion)}>
                      Confirm ticket
                    </button>
                    <button type="button" className="rounded-lg border border-[#EBE6DD] bg-white px-3 py-1.5 text-xs font-semibold text-[#78716C] hover:bg-[#FAF8F5]" onClick={() => void onReject(suggestion.id)}>
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!loading && !error && tickets.length === 0 && suggestions.length === 0 && (
          <p className="rounded-xl border border-[#EBE6DD] bg-white p-12 text-center text-xs text-[#78716C] shadow-sm">
            No maintenance tickets match these filters.
          </p>
        )}

        {/* Ticket Cards Grid */}
        {!loading && !error && tickets.length > 0 && (
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tickets.map((ticket) => (
              <TicketCard 
                key={ticket.id} 
                ticket={ticket} 
                propertyName={propertyName(ticket.property_id)} 
                activeContractors={activeContractors} 
                selectedContractor={selectedContractors[ticket.id] || ''} 
                onSelectedContractor={(value) => setSelectedContractors((current) => ({ ...current, [ticket.id]: value }))} 
                onAssign={() => void assign(ticket.id)} 
                statusNote={statusNotes[ticket.id] || ''} 
                onStatusNote={(value) => setStatusNotes((current) => ({ ...current, [ticket.id]: value }))} 
                onTransition={(status) => void transition(ticket.id, status)} 
                saving={saving} 
                history={statusHistories[ticket.id] || []} 
                historyShown={Boolean(shownHistory[ticket.id])} 
                onToggleHistory={() => void toggleHistory(ticket.id)} 
                onOpenGuestUpdate={() => openGuestUpdateModal(ticket)} 
              />
            ))}
          </section>
        )}

        {/* Create Ticket Modal */}
        {ticketFormOpen && (
          <Modal title="Create maintenance ticket">
            <form onSubmit={(event) => void submitTicket(event)} className="space-y-3">
              <label className="block text-xs font-semibold text-[#3B3735]">
                Property
                <select required value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className="mt-1 w-full rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] p-2 text-xs focus:outline-none focus:border-[#0F3D5E]">
                  <option value="">Select property</option>
                  {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-[#3B3735]">
                Title
                <input required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] p-2 text-xs focus:outline-none focus:border-[#0F3D5E]" placeholder="e.g. Master Bedroom AC Leaking" />
              </label>
              <label className="block text-xs font-semibold text-[#3B3735]">
                Description
                <textarea required value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] p-2 text-xs focus:outline-none focus:border-[#0F3D5E]" placeholder="Details of the defect..." />
              </label>
              <label className="block text-xs font-semibold text-[#3B3735]">
                Priority
                <select value={priority} onChange={(event) => setPriority(event.target.value as TicketPriority)} className="mt-1 w-full rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] p-2 text-xs focus:outline-none focus:border-[#0F3D5E]">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <ModalActions onCancel={resetTicket} saving={saving} label="Create ticket" />
            </form>
          </Modal>
        )}

        {/* Contractor Contact Form Modal */}
        {contractorFormOpen && (
          <Modal title={editingContractor ? 'Edit contractor contact' : 'Add contractor contact'}>
            <form onSubmit={(event) => void submitContractor(event)} className="space-y-3">
              <label className="block text-xs font-semibold text-[#3B3735]">
                Name
                <input required value={contractorName} onChange={(event) => setContractorName(event.target.value)} className="mt-1 w-full rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] p-2 text-xs focus:outline-none focus:border-[#0F3D5E]" placeholder="e.g. Hichem Clim Express" />
              </label>
              <label className="block text-xs font-semibold text-[#3B3735]">
                Phone
                <input value={contractorPhone} onChange={(event) => setContractorPhone(event.target.value)} className="mt-1 w-full rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] p-2 text-xs focus:outline-none focus:border-[#0F3D5E]" placeholder="+216 ..." />
              </label>
              <label className="block text-xs font-semibold text-[#3B3735]">
                Specialty
                <input value={contractorSpecialty} onChange={(event) => setContractorSpecialty(event.target.value)} className="mt-1 w-full rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] p-2 text-xs focus:outline-none focus:border-[#0F3D5E]" placeholder="e.g. Climatisation & Plomberie" />
              </label>
              <label className="block text-xs font-semibold text-[#3B3735]">
                Notes
                <textarea value={contractorNotes} onChange={(event) => setContractorNotes(event.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] p-2 text-xs focus:outline-none focus:border-[#0F3D5E]" placeholder="Rates, availability..." />
              </label>
              <ModalActions onCancel={() => { resetContractor(); setContractorFormOpen(false); }} saving={saving} label="Save contact" />
            </form>
          </Modal>
        )}

        {/* Send Guest Update Modal */}
        {guestUpdateModalTicket && (
          <Modal title="Send guest update (FR-TKT-08)">
            <form onSubmit={(event) => void submitGuestUpdate(event)} className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold text-[#78716C]">Approved message templates:</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setGuestUpdateContent(getTemplate(guestUpdateModalTicket, 'assigned'))} className="rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] px-2.5 py-1 text-xs font-semibold text-[#0F3D5E] hover:bg-[#F0F6FA]">
                    Assigned
                  </button>
                  <button type="button" onClick={() => setGuestUpdateContent(getTemplate(guestUpdateModalTicket, 'in_progress'))} className="rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] px-2.5 py-1 text-xs font-semibold text-[#0F3D5E] hover:bg-[#F0F6FA]">
                    In progress
                  </button>
                  <button type="button" onClick={() => setGuestUpdateContent(getTemplate(guestUpdateModalTicket, 'resolved'))} className="rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] px-2.5 py-1 text-xs font-semibold text-[#0F3D5E] hover:bg-[#F0F6FA]">
                    Resolved
                  </button>
                </div>
              </div>
              <label className="block text-xs font-semibold text-[#3B3735]">
                Review update message
                <textarea required aria-label="Guest update message" rows={4} value={guestUpdateContent} onChange={(event) => setGuestUpdateContent(event.target.value)} className="mt-1 w-full rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] p-2 text-xs focus:outline-none focus:border-[#0F3D5E]" placeholder="Type or edit update for the guest..." />
              </label>
              <ModalActions onCancel={() => { setGuestUpdateModalTicket(null); setGuestUpdateContent(''); }} saving={saving} label="Send update" />
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}

function TicketCard({ 
  ticket, 
  propertyName, 
  activeContractors, 
  selectedContractor, 
  onSelectedContractor, 
  onAssign, 
  statusNote, 
  onStatusNote, 
  onTransition, 
  saving, 
  history, 
  historyShown, 
  onToggleHistory, 
  onOpenGuestUpdate 
}: { 
  ticket: ApiTicket; 
  propertyName: string; 
  activeContractors: ApiContractor[]; 
  selectedContractor: string; 
  onSelectedContractor: (value: string) => void; 
  onAssign: () => void; 
  statusNote: string; 
  onStatusNote: (value: string) => void; 
  onTransition: (status: TicketStatus) => void; 
  saving: boolean; 
  history: ApiTicketStatusHistory[]; 
  historyShown: boolean; 
  onToggleHistory: () => void; 
  onOpenGuestUpdate: () => void; 
}) {
  const priorityBadges = {
    urgent: 'bg-[#FDF4F0] text-[#D96B43] border-[#FBE6DC]',
    high: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
    medium: 'bg-[#F0F6FA] text-[#0F3D5E] border-[#B6DAEA]',
    low: 'bg-[#FAF8F5] text-[#78716C] border-[#EBE6DD]',
  };

  return (
    <article className="rounded-xl border border-[#EBE6DD] bg-white p-4 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start gap-2">
          <h2 className="font-bold text-[#1C1B18] text-sm leading-snug">{ticket.title}</h2>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border shrink-0 ${priorityBadges[ticket.priority] || priorityBadges.low}`}>
            {ticket.priority}
          </span>
        </div>
        <p className="mt-2 text-xs text-[#3B3735] leading-relaxed">{ticket.description}</p>
        <p className="mt-3 text-[11px] text-[#78716C] flex items-center justify-between">
          <span>{propertyName}</span>
          <span className="font-semibold uppercase tracking-wider text-[#0F3D5E] bg-[#F0F6FA] px-2 py-0.5 rounded border border-[#B6DAEA]">
            {statusLabel(ticket.status)}
          </span>
        </p>

        {ticket.conversation_id && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-[#F0F6FA] px-3 py-2 text-xs border border-[#B6DAEA]/60">
            <span className="font-semibold text-[#0F3D5E] flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Linked conversation
            </span>
            <button type="button" onClick={onOpenGuestUpdate} className="font-bold text-[#0F3D5E] underline hover:text-[#0a273c]">
              Send guest update
            </button>
          </div>
        )}
      </div>

      <div>
        {!terminal.has(ticket.status) && (
          <div className="mt-4 space-y-2 border-t border-[#EBE6DD] pt-3 text-xs">
            {ticket.status === 'open' && (
              <>
                <label className="block text-xs font-bold text-[#3B3735]">
                  Assign contractor
                  <select aria-label={`Contractor for ${ticket.title}`} value={selectedContractor} onChange={(event) => onSelectedContractor(event.target.value)} className="mt-1 w-full rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] p-2 text-xs">
                    <option value="">Select active contractor</option>
                    {activeContractors.map((contractor) => <option key={contractor.id} value={contractor.id}>{contractor.name}</option>)}
                  </select>
                </label>
                <button type="button" disabled={saving || activeContractors.length === 0} onClick={onAssign} className="w-full rounded-lg bg-[#0F3D5E] p-2 text-xs font-bold text-white disabled:opacity-60 shadow-xs hover:bg-[#0C324E]">
                  Assign contractor
                </button>
              </>
            )}
            <label className="block text-xs font-bold text-[#3B3735]">
              Status note (optional)
              <textarea aria-label={`Status note for ${ticket.title}`} value={statusNote} onChange={(event) => onStatusNote(event.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] p-2 text-xs" />
            </label>
            {ticket.status === 'assigned' && (
              <button type="button" disabled={saving} onClick={() => onTransition('in_progress')} className="w-full rounded-lg bg-[#0F3D5E] p-2 text-xs font-bold text-white shadow-xs hover:bg-[#0C324E]">
                Start work
              </button>
            )}
            {ticket.status === 'in_progress' && (
              <button type="button" disabled={saving} onClick={() => onTransition('resolved')} className="w-full rounded-lg bg-[#16A34A] p-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700">
                Mark resolved
              </button>
            )}
            <button type="button" disabled={saving} onClick={() => onTransition('cancelled')} className="w-full rounded-lg border border-[#C25730] p-1.5 text-xs font-bold text-[#C25730] hover:bg-rose-50">
              Cancel ticket
            </button>
          </div>
        )}

        <button type="button" onClick={onToggleHistory} className="mt-3 text-xs font-bold text-[#0F3D5E] underline">
          {historyShown ? 'Hide status history' : 'Show status history'}
        </button>
        {historyShown && (
          <ol className="mt-2 space-y-1.5 border-t border-[#EBE6DD] pt-2 text-[11px] text-[#3B3735]">
            {history.map((entry) => (
              <li key={entry.id} className="p-1.5 rounded bg-[#FAF8F5] border border-[#EBE6DD]">
                <strong>{entry.from_status ? `${statusLabel(entry.from_status)} → ` : ''}{statusLabel(entry.to_status)}</strong>
                <div className="text-[10px] text-[#78716C] mt-0.5">{new Date(entry.changed_at).toLocaleString()} · {entry.changed_by_user_id}</div>
                {entry.note && <p className="mt-1 text-xs">{entry.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </article>
  );
}

function Filter({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) { 
  return (
    <label className="text-xs font-bold text-[#3B3735]">
      {label}
      <select aria-label={`Filter by ${label.toLowerCase()}`} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] p-2 text-xs focus:outline-none focus:border-[#0F3D5E]">
        {children}
      </select>
    </label>
  ); 
}

function Modal({ title, children }: { title: string; children: ReactNode }) { 
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1B18]/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 border border-[#EBE6DD] shadow-2xl">
        <h2 className="text-base font-bold text-[#1C1B18] border-b border-[#EBE6DD] pb-3">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  ); 
}

function ModalActions({ onCancel, saving, label }: { onCancel: () => void; saving: boolean; label: string }) { 
  return (
    <div className="flex gap-2 pt-2">
      <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-[#EBE6DD] p-2 text-xs font-semibold text-[#78716C] hover:bg-[#FAF8F5]">
        Cancel
      </button>
      <button disabled={saving} className="flex-1 rounded-lg bg-[#0F3D5E] p-2 text-xs font-bold text-white hover:bg-[#0C324E] shadow-sm disabled:opacity-50">
        {saving ? 'Saving...' : label}
      </button>
    </div>
  ); 
}
