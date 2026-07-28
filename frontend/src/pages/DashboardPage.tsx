import type { Property, Booking, Ticket } from '../data/mockData';
import { 
  Building2, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Calendar as CalendarIcon, 
  MessageSquare, 
  CheckSquare, 
  ArrowUpRight, 
  Sparkles,
  Zap,
  Clock
} from 'lucide-react';
import type { ActivePage } from '../components/Sidebar';

interface DashboardPageProps {
  properties: Property[];
  bookings: Booking[];
  tickets: Ticket[];
  onNavigate: (page: ActivePage) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  properties,
  bookings,
  tickets,
  onNavigate
}) => {
  // Calculated KPIs
  const occupiedCount = properties.filter(p => p.status === 'Occupied').length;
  const occupancyRate = Math.round((occupiedCount / properties.length) * 100);
  const totalRevenueTND = bookings.reduce((sum, b) => sum + b.totalTND, 0);
  const activeGuestsCount = bookings
    .filter(b => b.status === 'Checked-In' || b.status === 'Confirmed')
    .reduce((sum, b) => sum + b.guestsCount, 0);
  const openTicketsCount = tickets.filter(t => t.status !== 'Resolved').length;

  const conflictBookings = bookings.filter(b => b.status === 'Conflict');

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EBE6DD] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#D96B43] bg-[#FDF4F0] px-2.5 py-1 rounded-lg border border-[#FBE6DC]">
              Hammamet & North Coast Portfolio
            </span>
            <span className="text-xs font-medium text-[#78716C]">Jul 21, 2026</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1C1B18] mt-1.5 tracking-tight">
            Portfolio Operations Command Center
          </h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            Real-time status across 5 luxury Tunisian properties in Hammamet, Sidi Bou Said, Tunis & Djerba.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('calendar')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#EBE6DD] text-xs font-semibold text-[#1C1B18] hover:bg-[#FAF8F5] hover:border-[#0F3D5E] transition-all shadow-sm"
          >
            <CalendarIcon className="w-4 h-4 text-[#0F3D5E]" />
            Calendar
          </button>
          <button
            onClick={() => onNavigate('inbox')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F3D5E] text-white text-xs font-semibold hover:bg-[#0C324E] transition-all shadow-[0_2px_8px_rgba(15,61,94,0.2)]"
          >
            <MessageSquare className="w-4 h-4 text-[#E8A838]" />
            Messages
          </button>
        </div>
      </div>

      {/* Urgent Alert Banner if Conflict Exists */}
      {conflictBookings.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-rose-900 flex items-center gap-2">
                Booking Channel Conflict Detected ({conflictBookings.length})
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-rose-600 text-white">Action Needed</span>
              </div>
              <p className="text-xs text-rose-700 mt-1">
                {conflictBookings[0].propertyName}: Overlap between Airbnb and Booking.com for {conflictBookings[0].guestName}.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('calendar')}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shrink-0 transition-colors shadow-sm"
          >
            Resolve Overlap Now
          </button>
        </div>
      )}

      {/* Portfolio KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: Occupancy Rate */}
        <div className="p-5 rounded-2xl bg-white border border-[#EBE6DD] shadow-[0_2px_8px_rgba(28,27,24,0.02)] relative overflow-hidden group hover:border-[#0F3D5E]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#78716C] uppercase tracking-wider">Portfolio Occupancy</span>
            <div className="p-2 rounded-xl bg-[#F0F6FA] text-[#0F3D5E]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#1C1B18] tracking-tight">{occupancyRate}%</span>
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> +12% vs last week
            </span>
          </div>
          <p className="text-xs text-[#78716C] mt-2">
            {occupiedCount} of {properties.length} properties currently occupied
          </p>
        </div>

        {/* KPI 2: July Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-[#EBE6DD] shadow-[0_2px_8px_rgba(28,27,24,0.02)] relative overflow-hidden group hover:border-[#0F3D5E]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#78716C] uppercase tracking-wider">Gross Revenue (Jul)</span>
            <div className="p-2 rounded-xl bg-[#FDF4F0] text-[#D96B43]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#1C1B18] tracking-tight">{totalRevenueTND.toLocaleString()} <span className="text-sm font-semibold text-[#78716C]">TND</span></span>
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-0.5">
              +18.4%
            </span>
          </div>
          <p className="text-xs text-[#78716C] mt-2">
            Direct and Channel Bookings
          </p>
        </div>

        {/* KPI 3: Active Guests */}
        <div className="p-5 rounded-2xl bg-white border border-[#EBE6DD] shadow-[0_2px_8px_rgba(28,27,24,0.02)] relative overflow-hidden group hover:border-[#0F3D5E]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#78716C] uppercase tracking-wider">Active Guests</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#1C1B18] tracking-tight">{activeGuestsCount}</span>
            <span className="text-xs font-medium text-[#78716C]">In-house & Upcoming</span>
          </div>
          <p className="text-xs text-[#78716C] mt-2">
            Hammamet, Sidi Bou Said & Djerba
          </p>
        </div>

        {/* KPI 4: Pending Tickets */}
        <div className="p-5 rounded-2xl bg-white border border-[#EBE6DD] shadow-[0_2px_8px_rgba(28,27,24,0.02)] relative overflow-hidden group hover:border-[#0F3D5E]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#78716C] uppercase tracking-wider">Open Maintenance</span>
            <div className="p-2 rounded-xl bg-[#0F3D5E] text-white">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#1C1B18] tracking-tight">{openTicketsCount}</span>
            <span className="text-xs font-medium text-[#D96B43]">1 High Priority</span>
          </div>
          <p className="text-xs text-[#78716C] mt-2">
            Kanban maintenance board
          </p>
        </div>
      </div>

      {/* Main Grid: Quick Links & Today's Schedule + AI Assistant Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Properties Overview & Quick Navigation (2 cols wide) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Featured Knowledge Quick Link */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0F3D5E] to-[#1E517B] text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[#E8A838] text-[11px] font-semibold tracking-wide">
                <Sparkles className="w-3.5 h-3.5" /> Featured Property Information
              </div>
              <h3 className="text-lg font-bold">Villa Yasmine — Hammamet</h3>
              <p className="text-xs text-white/80 max-w-md">
                Quick access to WiFi details, house rules, water conservation policies, and gate codes for staff & guests.
              </p>
            </div>
            <button
              onClick={() => onNavigate('property-detail')}
              className="px-4 py-2.5 rounded-xl bg-[#E8A838] hover:bg-[#CF9024] text-[#1C1B18] text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5"
            >
              View Knowledge Card
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Properties Quick Cards */}
          <div className="bg-white rounded-2xl border border-[#EBE6DD] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-[#1C1B18]">Property Portfolio Status</h3>
                <p className="text-xs text-[#78716C]">Current occupancy and guest notes</p>
              </div>
              <button 
                onClick={() => onNavigate('properties')}
                className="text-xs font-semibold text-[#0F3D5E] hover:underline flex items-center gap-1"
              >
                View all properties ({properties.length}) &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {properties.slice(0, 4).map((prop) => (
                <div 
                  key={prop.id}
                  onClick={() => onNavigate('property-detail')}
                  className="p-4 rounded-xl border border-[#EBE6DD] bg-[#FAF8F5]/60 hover:bg-white hover:border-[#0F3D5E] transition-all cursor-pointer group flex items-start gap-3.5"
                >
                  <img 
                    src={prop.imageUrl} 
                    alt={prop.name} 
                    className="w-16 h-16 rounded-lg object-cover border border-[#EBE6DD] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-[#1C1B18] truncate group-hover:text-[#0F3D5E]">{prop.name}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        prop.status === 'Occupied' ? 'bg-emerald-100 text-emerald-800' :
                        prop.status === 'Available' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {prop.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#78716C] mt-0.5 truncate">{prop.location}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-[#3B3735] font-medium border-t border-[#EBE6DD] pt-1.5">
                      <span>{prop.nightlyRateTND} TND/night</span>
                      <span className="text-[#D96B43] font-bold">★ {prop.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: AI Assistant Status & Recent Operations Feed */}
        <div className="space-y-6">

          {/* Chatbot prototype status */}
          <div className="p-5 rounded-2xl bg-white border border-[#EBE6DD] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#1C1B18]">Guest Chatbot Prototype</h4>
                  <p className="text-[10px] text-emerald-700 font-semibold">Active & Auto-Replying</p>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <p className="text-xs text-[#78716C] leading-relaxed mb-3">
              AI model is trained on Tunisian WiFi rules, check-in policies, and pool/BBQ guidelines. Handled 14 guest inquiries today.
            </p>

            <button
              onClick={() => onNavigate('inbox')}
              className="w-full py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#F0F6FA] border border-[#EBE6DD] text-xs font-semibold text-[#0F3D5E] flex items-center justify-center gap-1.5 transition-colors"
            >
              Open Inbox & View Automated Responses
            </button>
          </div>

          {/* Recent Operations Timeline */}
          <div className="p-5 rounded-2xl bg-white border border-[#EBE6DD] shadow-sm">
            <h4 className="font-bold text-xs text-[#1C1B18] mb-3 uppercase tracking-wider text-[#78716C]">
              Today's Live Ops Activity
            </h4>

            <div className="space-y-3">
              <div className="flex items-start gap-2.5 pb-3 border-b border-[#EBE6DD]">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                  AI
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-[#1C1B18]">WiFi details provided</div>
                  <p className="text-[11px] text-[#78716C]">Guest Sarah Jenkins (Villa Yasmine)</p>
                  <span className="text-[10px] text-[#78716C] flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> 10:31 AM
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pb-3 border-b border-[#EBE6DD]">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                  OPS
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-[#1C1B18]">Ticket assigned: Boiler Repair</div>
                  <p className="text-[11px] text-[#78716C]">Amine assigned to Dar El Bey</p>
                  <span className="text-[10px] text-[#78716C] flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> 09:25 AM
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                  Channel
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-[#1C1B18]">Conflict Flagged</div>
                  <p className="text-[11px] text-[#78716C]">Booking.com vs Airbnb (Villa Yasmine)</p>
                  <span className="text-[10px] text-[#78716C] flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> 08:00 AM
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
