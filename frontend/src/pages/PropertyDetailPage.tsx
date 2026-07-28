import React, { useState } from 'react';
import type { Property, Booking } from '../data/mockData';
import { 
  Wifi, 
  Key, 
  Clock, 
  Trash2, 
  ShieldAlert, 
  Phone, 
  MapPin, 
  Users, 
  Bed, 
  Bath, 
  Calendar as CalendarIcon,
  CheckCircle2,
  Copy,
  Sparkles,
  Edit3
} from 'lucide-react';

interface PropertyDetailPageProps {
  property: Property;
  bookings: Booking[];
}

export const PropertyDetailPage: React.FC<PropertyDetailPageProps> = ({
  property,
  bookings
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const propertyBookings = bookings.filter(b => b.propertyId === property.id);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Property Hero Banner & Specs Header */}
      <div className="bg-white rounded-2xl border border-[#EBE6DD] p-6 shadow-sm flex flex-col lg:flex-row gap-6">
        <img 
          src={property.imageUrl} 
          alt={property.name}
          className="w-full lg:w-72 h-52 rounded-xl object-cover border border-[#EBE6DD] shadow-xs"
        />

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#D96B43] bg-[#FDF4F0] px-2.5 py-1 rounded-lg border border-[#FBE6DC]">
                ★ {property.rating} Luxury Rated
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {property.status}
              </span>
            </div>
            <span className="text-xl font-extrabold text-[#0F3D5E]">
              {property.nightlyRateTND} TND <span className="text-xs font-normal text-[#78716C]">/ night</span>
            </span>
          </div>

          <h1 className="text-2xl font-bold text-[#1C1B18] tracking-tight">{property.name}</h1>
          <p className="text-xs text-[#78716C] flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#D96B43]" /> {property.location} ({property.city}, Tunisia)
          </p>

          <div className="pt-3 border-t border-[#EBE6DD] grid grid-cols-3 gap-4 text-xs font-semibold text-[#3B3735]">
            <div className="flex items-center gap-2">
              <Bed className="w-4 h-4 text-[#0F3D5E]" /> {property.bedrooms} Bedrooms
            </div>
            <div className="flex items-center gap-2">
              <Bath className="w-4 h-4 text-[#0F3D5E]" /> {property.bathrooms} Bathrooms
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0F3D5E]" /> Max {property.maxGuests} Guests
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: WiFi & Rules Knowledge Card (Left) vs Property Calendar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Knowledge Card (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-[#EBE6DD] p-6 shadow-sm space-y-6">
            
            <div className="flex items-center justify-between border-b border-[#EBE6DD] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#F0F6FA] text-[#0F3D5E]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-[#1C1B18]">WiFi & House Rules Knowledge Card</h2>
                  <p className="text-xs text-[#78716C]">Staff Operations & Guest Chatbot Knowledge Base</p>
                </div>
              </div>

              <button className="px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#EBE6DD] text-xs font-semibold text-[#0F3D5E] hover:bg-[#F0F6FA] flex items-center gap-1 transition-colors">
                <Edit3 className="w-3.5 h-3.5" /> Edit Rules
              </button>
            </div>

            {/* WiFi & Key Codes Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* WiFi Network Card */}
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD] space-y-2">
                <div className="flex items-center justify-between text-xs text-[#78716C] font-semibold">
                  <span className="flex items-center gap-1.5 text-[#0F3D5E]">
                    <Wifi className="w-4 h-4" /> Guest WiFi Network
                  </span>
                  {copiedField === 'wifi' && <span className="text-emerald-600 text-[10px] font-bold">Copied!</span>}
                </div>
                <div className="font-mono text-xs font-bold text-[#1C1B18]">{property.wifiSSID}</div>
                <div className="flex items-center justify-between pt-1 border-t border-[#EBE6DD]">
                  <span className="text-[11px] text-[#78716C]">Key: <span className="font-mono text-[#1C1B18] font-semibold">{property.wifiPass}</span></span>
                  <button 
                    onClick={() => handleCopy(property.wifiPass, 'wifi')}
                    className="p-1 text-[#78716C] hover:text-[#0F3D5E] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Smart Lock Door Code */}
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD] space-y-2">
                <div className="flex items-center justify-between text-xs text-[#78716C] font-semibold">
                  <span className="flex items-center gap-1.5 text-[#D96B43]">
                    <Key className="w-4 h-4" /> Smart Keypad Code
                  </span>
                  {copiedField === 'door' && <span className="text-emerald-600 text-[10px] font-bold">Copied!</span>}
                </div>
                <div className="font-mono text-sm font-bold text-[#1C1B18]">{property.doorCode}</div>
                <div className="flex items-center justify-between pt-1 border-t border-[#EBE6DD]">
                  <span className="text-[11px] text-[#78716C]">Resets per check-in</span>
                  <button 
                    onClick={() => handleCopy(property.doorCode, 'door')}
                    className="p-1 text-[#78716C] hover:text-[#0F3D5E] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>

            {/* Check-In / Check-Out & Trash Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl border border-[#EBE6DD] bg-white flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#0F3D5E] shrink-0" />
                <div>
                  <span className="text-[#78716C] block text-[10px] uppercase font-semibold">Check-In / Out Windows</span>
                  <span className="font-bold text-[#1C1B18]">In: {property.checkInTime} | Out: {property.checkOutTime}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[#EBE6DD] bg-white flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-[#D96B43] shrink-0" />
                <div>
                  <span className="text-[#78716C] block text-[10px] uppercase font-semibold">Municipal Trash Schedule</span>
                  <span className="font-semibold text-[#1C1B18] text-[11px]">{property.trashSchedule}</span>
                </div>
              </div>
            </div>

            {/* House Rules & Local Policy list */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#3B3735] flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                House Rules & Policy Directives
              </h3>
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD] space-y-2 text-xs">
                {property.houseRules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[#3B3735]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency Hotline Contact */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-700" />
                <span className="font-semibold text-amber-900">Ops Emergency Contact:</span>
              </div>
              <span className="font-mono font-bold text-amber-950">{property.emergencyContact}</span>
            </div>

          </div>
        </div>

        {/* Property Calendar & Reservations List (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-[#EBE6DD] p-6 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between border-b border-[#EBE6DD] pb-3">
              <h2 className="font-bold text-base text-[#1C1B18] flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#0F3D5E]" />
                Upcoming Bookings
              </h2>
              <span className="text-xs font-semibold text-[#0F3D5E] bg-[#F0F6FA] px-2.5 py-0.5 rounded-full">
                {propertyBookings.length} Active
              </span>
            </div>

            {/* Bookings List Cards */}
            <div className="space-y-3">
              {propertyBookings.map((bk) => (
                <div 
                  key={bk.id}
                  className={`p-4 rounded-xl border transition-all ${
                    bk.status === 'Conflict' 
                      ? 'bg-rose-50 border-rose-300' 
                      : 'bg-[#FAF8F5] border-[#EBE6DD]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                      bk.channel === 'Airbnb' ? 'bg-[#FF5A5F]' :
                      bk.channel === 'Booking.com' ? 'bg-[#003580]' :
                      'bg-[#0F3D5E]'
                    }`}>
                      {bk.channel}
                    </span>
                    <span className="text-xs font-bold text-[#1C1B18]">{bk.totalTND} TND</span>
                  </div>

                  <div className="mt-2">
                    <div className="font-bold text-xs text-[#1C1B18]">{bk.guestName}</div>
                    <div className="text-[11px] text-[#78716C] mt-0.5">
                      {bk.startDate} &rarr; {bk.endDate} ({bk.guestsCount} Guests)
                    </div>
                  </div>

                  {bk.status === 'Conflict' && (
                    <div className="mt-2 text-[10px] font-bold text-rose-700 flex items-center gap-1">
                      ⚠️ OVERLAP ALERT: Booking.com conflict on Jul 25
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
