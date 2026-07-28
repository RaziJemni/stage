import React, { useState } from 'react';
import type { Ticket } from '../data/mockData';
import { 
  Plus, 
  User, 
  Building2, 
  X
} from 'lucide-react';

interface TicketsPageProps {
  tickets: Ticket[];
  onUpdateTicketStatus: (ticketId: string, newStatus: Ticket['status']) => void;
  onAddTicket: (newTicket: Ticket) => void;
}

export const TicketsPage: React.FC<TicketsPageProps> = ({
  tickets,
  onUpdateTicketStatus,
  onAddTicket
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New ticket form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyName] = useState('Villa Yasmine, Hammamet');
  const [category] = useState<Ticket['category']>('Maintenance');
  const [priority, setPriority] = useState<Ticket['priority']>('High');
  const [assignedTo, setAssignedTo] = useState('Amine Bouazizi');

  const columns: { status: Ticket['status']; title: string; color: string }[] = [
    { status: 'Open', title: 'Open Tickets', color: 'border-[#D96B43] bg-rose-50/50' },
    { status: 'Assigned', title: 'Assigned to Staff', color: 'border-amber-400 bg-amber-50/50' },
    { status: 'In Progress', title: 'In Progress', color: 'border-blue-500 bg-blue-50/50' },
    { status: 'Resolved', title: 'Resolved', color: 'border-emerald-500 bg-emerald-50/50' },
  ];

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const newT: Ticket = {
      id: `tck-${Date.now()}`,
      title: title || 'New Operations Task',
      description: description || 'Property maintenance task requested.',
      propertyId: 'prop-1',
      propertyName: propertyName,
      category: category,
      priority: priority,
      status: 'Open',
      assignedTo: assignedTo,
      createdAt: 'Just Now'
    };

    onAddTicket(newT);
    setIsModalOpen(false);
    setTitle('');
    setDescription('');
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EBE6DD] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0F3D5E] bg-[#F0F6FA] px-2.5 py-1 rounded-lg border border-[#B6DAEA]">
              Maintenance ({tickets.length} Total Tickets)
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#1C1B18] mt-1.5 tracking-tight">
            Property Maintenance
          </h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            Track housekeeping requests, maintenance tasks, and urgent guest tickets.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F3D5E] hover:bg-[#0C324E] text-white text-xs font-bold shadow-md transition-all shrink-0"
        >
          <Plus className="w-4 h-4 text-[#E8A838]" />
          Create New Operations Ticket
        </button>
      </div>

      {/* 4 Columns Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((col) => {
          const colTickets = tickets.filter((t) => t.status === col.status);

          return (
            <div 
              key={col.status}
              className="bg-white rounded-2xl border border-[#EBE6DD] p-4 shadow-sm flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EBE6DD]">
                <h3 className="font-bold text-xs text-[#1C1B18] uppercase tracking-wider flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    col.status === 'Open' ? 'bg-[#D96B43]' :
                    col.status === 'Assigned' ? 'bg-amber-500' :
                    col.status === 'In Progress' ? 'bg-blue-500' :
                    'bg-emerald-500'
                  }`} />
                  {col.title}
                </h3>
                <span className="text-xs font-bold text-[#78716C] bg-[#FAF8F5] px-2 py-0.5 rounded-full border border-[#EBE6DD]">
                  {colTickets.length}
                </span>
              </div>

              {/* Tickets Column Cards List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl border border-[#EBE6DD] bg-[#FAF8F5]/60 hover:bg-white hover:border-[#0F3D5E] transition-all shadow-xs space-y-3"
                  >
                    {/* Priority & Category Badges */}
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className={`px-2 py-0.5 rounded-full ${
                        t.priority === 'High' ? 'bg-rose-100 text-rose-800' :
                        t.priority === 'Medium' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {t.priority} Priority
                      </span>
                      <span className="text-[#0F3D5E] bg-[#F0F6FA] px-2 py-0.5 rounded-full border border-[#B6DAEA]">
                        {t.category}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-[#1C1B18] leading-snug">{t.title}</h4>
                      <p className="text-[11px] text-[#78716C] mt-1 line-clamp-2">{t.description}</p>
                    </div>

                    <div className="text-[10px] text-[#3B3735] font-semibold flex items-center gap-1 border-t border-[#EBE6DD] pt-2">
                      <Building2 className="w-3 h-3 text-[#D96B43]" />
                      <span className="truncate">{t.propertyName}</span>
                    </div>

                    {t.assignedTo && (
                      <div className="flex items-center justify-between text-[10px] text-[#78716C]">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-[#0F3D5E]" /> {t.assignedTo}
                        </span>
                        <span>{t.createdAt}</span>
                      </div>
                    )}

                    {/* Quick Move Status Controls */}
                    <div className="pt-2 flex items-center gap-1 justify-end border-t border-[#EBE6DD]">
                      {col.status !== 'Open' && (
                        <button
                          onClick={() => {
                            const prev = col.status === 'Resolved' ? 'In Progress' : col.status === 'In Progress' ? 'Assigned' : 'Open';
                            onUpdateTicketStatus(t.id, prev as any);
                          }}
                          className="px-2 py-1 rounded text-[10px] font-semibold bg-[#FAF8F5] text-[#78716C] hover:bg-white border border-[#EBE6DD]"
                        >
                          &larr; Back
                        </button>
                      )}
                      {col.status !== 'Resolved' && (
                        <button
                          onClick={() => {
                            const next = col.status === 'Open' ? 'Assigned' : col.status === 'Assigned' ? 'In Progress' : 'Resolved';
                            onUpdateTicketStatus(t.id, next as any);
                          }}
                          className="px-2 py-1 rounded text-[10px] font-bold bg-[#0F3D5E] text-white hover:bg-[#0C324E]"
                        >
                          Move &rarr;
                        </button>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1C1B18]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EBE6DD] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EBE6DD] pb-3">
              <h3 className="font-bold text-base text-[#1C1B18]">Create Maintenance Ticket</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-[#78716C]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#3B3735] mb-1">Issue Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. AC leaking in living room" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#3B3735] mb-1">Description</label>
                <textarea 
                  rows={3}
                  required
                  placeholder="Provide context for maintenance team..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#3B3735] mb-1">Priority</label>
                  <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none"
                  >
                    <option value="High">High (Urgent)</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#3B3735] mb-1">Assign Staff</label>
                  <select 
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none"
                  >
                    <option value="Amine Bouazizi">Amine (Maintenance)</option>
                    <option value="Fatma Trabelsi">Fatma (Housekeeping)</option>
                    <option value="Amira Mansour">Amira (Ops Lead)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2 rounded-xl border border-[#EBE6DD] font-semibold text-[#78716C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-[#0F3D5E] text-white font-bold"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
