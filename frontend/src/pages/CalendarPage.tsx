import React, { useState } from 'react';
import type { Property, Booking } from '../data/mockData';
import { 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  Plus
} from 'lucide-react';

interface CalendarPageProps {
  properties: Property[];
  bookings: Booking[];
  onSelectProperty?: (propId: string) => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({
  properties,
  bookings,
  onSelectProperty
}) => {
  const [selectedChannel, setSelectedChannel] = useState<string>('All');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<Booking | null>(bookings[1] || null);

  // Generate July 18 - July 31 date columns (14 days view)
  const days = [
    { dateStr: '2026-07-18', dayNum: '18', dayName: 'Sat' },
    { dateStr: '2026-07-19', dayNum: '19', dayName: 'Sun' },
    { dateStr: '2026-07-20', dayNum: '20', dayName: 'Mon' },
    { dateStr: '2026-07-21', dayNum: '21', dayName: 'Tue', isToday: true },
    { dateStr: '2026-07-22', dayNum: '22', dayName: 'Wed' },
    { dateStr: '2026-07-23', dayNum: '23', dayName: 'Thu' },
    { dateStr: '2026-07-24', dayNum: '24', dayName: 'Fri' },
    { dateStr: '2026-07-25', dayNum: '25', dayName: 'Sat' },
    { dateStr: '2026-07-26', dayNum: '26', dayName: 'Sun' },
    { dateStr: '2026-07-27', dayNum: '27', dayName: 'Mon' },
    { dateStr: '2026-07-28', dayNum: '28', dayName: 'Tue' },
    { dateStr: '2026-07-29', dayNum: '29', dayName: 'Wed' },
    { dateStr: '2026-07-30', dayNum: '30', dayName: 'Thu' },
    { dateStr: '2026-07-31', dayNum: '31', dayName: 'Fri' },
  ];

  // Channel badge colors
  const getChannelBadgeClass = (channel: string) => {
    switch (channel) {
      case 'Airbnb':
        return 'bg-[#FF5A5F] text-white';
      case 'Booking.com':
        return 'bg-[#003580] text-white';
      case 'Direct':
        return 'bg-[#0F3D5E] text-[#E8A838]';
      case 'VRBO':
        return 'bg-[#196B24] text-white';
      default:
        return 'bg-[#78716C] text-white';
    }
  };

  const filteredProperties = properties.filter(p => {
    if (selectedCity !== 'All' && p.city !== selectedCity) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EBE6DD] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0F3D5E] bg-[#F0F6FA] px-2.5 py-1 rounded-lg border border-[#B6DAEA]">
              Multi-Channel iCal & API Grid
            </span>
            <span className="text-xs text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> 1 Conflict Detected
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#1C1B18] mt-1.5 tracking-tight">
            Multi-Property Booking Calendar
          </h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            Real-time synchronization across Airbnb, Booking.com, VRBO & Direct bookings for Tunisian properties.
          </p>
        </div>

        {/* Date Controls & Legend */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white rounded-xl border border-[#EBE6DD] p-1 shadow-sm">
            <button className="p-1.5 rounded-lg hover:bg-[#FAF8F5] text-[#3B3735]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-[#1C1B18]">July 2026</span>
            <button className="p-1.5 rounded-lg hover:bg-[#FAF8F5] text-[#3B3735]">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F3D5E] hover:bg-[#0C324E] text-white text-xs font-semibold shadow-sm transition-colors">
            <Plus className="w-4 h-4 text-[#E8A838]" />
            New Direct Booking
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-[#EBE6DD] shadow-sm flex flex-wrap items-center justify-between gap-4">
        
        <div className="flex items-center gap-4 flex-wrap">
          {/* City Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#78716C]">Region:</span>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl text-xs font-medium px-3 py-1.5 text-[#1C1B18] focus:outline-none focus:border-[#0F3D5E]"
            >
              <option value="All">All Regions (Tunisia)</option>
              <option value="Hammamet">Hammamet</option>
              <option value="Sidi Bou Said">Sidi Bou Said</option>
              <option value="Tunis">Tunis (Lac / Goulette)</option>
              <option value="Djerba">Djerba</option>
            </select>
          </div>

          {/* Channel Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#78716C]">Channel:</span>
            <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#EBE6DD]">
              {['All', 'Airbnb', 'Booking.com', 'Direct', 'VRBO'].map((ch) => (
                <button
                  key={ch}
                  onClick={() => setSelectedChannel(ch)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedChannel === ch
                      ? 'bg-white text-[#0F3D5E] shadow-sm font-bold border border-[#EBE6DD]'
                      : 'text-[#78716C] hover:text-[#1C1B18]'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-[#78716C]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A5F]" /> Airbnb
          </span>
          <span className="flex items-center gap-1 text-[#78716C]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#003580]" /> Booking.com
          </span>
          <span className="flex items-center gap-1 text-[#78716C]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F3D5E]" /> Direct
          </span>
          <span className="flex items-center gap-1 text-rose-600 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" /> Conflict Alert
          </span>
        </div>
      </div>

      {/* Multi-Property Calendar Grid Table */}
      <div className="bg-white rounded-2xl border border-[#EBE6DD] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[900px]">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EBE6DD]">
                <th className="py-3 px-4 font-bold text-xs text-[#1C1B18] w-60 sticky left-0 bg-[#FAF8F5] z-10 border-r border-[#EBE6DD]">
                  Property Name & Location
                </th>
                {days.map((d) => (
                  <th
                    key={d.dateStr}
                    className={`py-2 px-1 text-center font-semibold text-xs border-r border-[#EBE6DD] min-w-[56px] ${
                      d.isToday ? 'bg-[#0F3D5E]/10 text-[#0F3D5E] font-bold' : 'text-[#78716C]'
                    }`}
                  >
                    <div className="text-[10px] uppercase">{d.dayName}</div>
                    <div className={`text-xs ${d.isToday ? 'text-[#0F3D5E] font-bold' : 'text-[#1C1B18]'}`}>
                      {d.dayNum}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBE6DD]">
              {filteredProperties.map((prop) => {
                const propBookings = bookings.filter(b => b.propertyId === prop.id);
                
                return (
                  <tr key={prop.id} className="hover:bg-[#FAF8F5]/40 transition-colors">
                    
                    {/* Property Label Sticky Left Column */}
                    <td className="py-3 px-4 sticky left-0 bg-white z-10 border-r border-[#EBE6DD] shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={prop.imageUrl} 
                          alt={prop.name}
                          className="w-10 h-10 rounded-lg object-cover border border-[#EBE6DD] shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 
                            onClick={() => onSelectProperty && onSelectProperty(prop.id)}
                            className="font-bold text-xs text-[#1C1B18] truncate hover:text-[#0F3D5E] cursor-pointer"
                          >
                            {prop.name}
                          </h4>
                          <p className="text-[10px] text-[#78716C] truncate">{prop.city}</p>
                        </div>
                      </div>
                    </td>

                    {/* 14 Days Cell Grid */}
                    {days.map((d) => {
                      // Find bookings active on this date
                      const activeOnDay = propBookings.filter(b => {
                        return d.dateStr >= b.startDate && d.dateStr <= b.endDate;
                      });

                      const hasConflict = activeOnDay.length > 1 || activeOnDay.some(b => b.status === 'Conflict');
                      const primaryBooking = activeOnDay[0];

                      return (
                        <td
                          key={d.dateStr}
                          className={`p-1 border-r border-[#EBE6DD] text-center align-middle relative h-14 ${
                            d.isToday ? 'bg-[#0F3D5E]/5' : ''
                          }`}
                        >
                          {hasConflict ? (
                            <div 
                              onClick={() => setSelectedBookingDetails(activeOnDay.find(b => b.status === 'Conflict') || primaryBooking)}
                              className="w-full h-full rounded-lg bg-rose-500 text-white font-bold text-[10px] p-1 flex flex-col justify-center items-center cursor-pointer shadow-sm animate-pulse"
                              title="CRITICAL: Double Booking Conflict!"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>OVERLAP</span>
                            </div>
                          ) : primaryBooking ? (
                            <div
                              onClick={() => setSelectedBookingDetails(primaryBooking)}
                              className={`w-full h-full rounded-lg text-[10px] font-semibold p-1 flex flex-col justify-center items-start cursor-pointer transition-transform hover:scale-105 shadow-xs truncate ${getChannelBadgeClass(primaryBooking.channel)}`}
                            >
                              <div className="font-bold truncate w-full">{primaryBooking.guestName}</div>
                              <div className="text-[9px] opacity-90 truncate">{primaryBooking.channel}</div>
                            </div>
                          ) : (
                            <div className="w-full h-full rounded-lg border border-dashed border-transparent hover:border-[#DDD7CC] hover:bg-[#FAF8F5] transition-colors" />
                          )}
                        </td>
                      );
                    })}

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Booking Detail Modal / Drawer Card */}
      {selectedBookingDetails && (
        <div className="p-6 bg-white rounded-2xl border border-[#EBE6DD] shadow-md relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EBE6DD] pb-4">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getChannelBadgeClass(selectedBookingDetails.channel)}`}>
                {selectedBookingDetails.channel}
              </span>
              <div>
                <h3 className="font-bold text-base text-[#1C1B18]">
                  Reservation #{selectedBookingDetails.id} — {selectedBookingDetails.guestName}
                </h3>
                <p className="text-xs text-[#78716C]">
                  {selectedBookingDetails.propertyName} ({selectedBookingDetails.startDate} to {selectedBookingDetails.endDate})
                </p>
              </div>
            </div>

            {selectedBookingDetails.status === 'Conflict' && (
              <div className="px-3 py-1.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Channel Overlap Resolution Required
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-xs">
            <div>
              <span className="text-[#78716C] block mb-0.5">Guest Contact:</span>
              <span className="font-semibold text-[#1C1B18]">{selectedBookingDetails.guestPhone}</span>
              <span className="text-[#78716C] block truncate">{selectedBookingDetails.guestEmail}</span>
            </div>
            <div>
              <span className="text-[#78716C] block mb-0.5">Total Stay Revenue:</span>
              <span className="font-bold text-sm text-[#0F3D5E]">{selectedBookingDetails.totalTND} TND</span>
            </div>
            <div>
              <span className="text-[#78716C] block mb-0.5">Party Size:</span>
              <span className="font-semibold text-[#1C1B18]">{selectedBookingDetails.guestsCount} Guests</span>
            </div>
            <div className="flex items-center gap-2">
              {selectedBookingDetails.status === 'Conflict' ? (
                <button className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm">
                  Cancel Booking.com & Notify Guest
                </button>
              ) : (
                <button className="w-full py-2 px-3 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD] text-[#0F3D5E] hover:bg-[#F0F6FA] font-semibold text-xs">
                  Modify Reservation Dates
                </button>
              )}
            </div>
          </div>

          {selectedBookingDetails.conflictNotes && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {selectedBookingDetails.conflictNotes}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
