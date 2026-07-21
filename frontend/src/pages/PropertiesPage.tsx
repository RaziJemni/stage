import React, { useState } from 'react';
import type { Property } from '../data/mockData';
import { 
  Building2, 
  Plus, 
  MapPin, 
  Search, 
  X
} from 'lucide-react';

interface PropertiesPageProps {
  properties: Property[];
  onSelectProperty: (propId: string) => void;
  onAddProperty: (newProp: Property) => void;
}

export const PropertiesPage: React.FC<PropertiesPageProps> = ({
  properties,
  onSelectProperty,
  onAddProperty
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State for Add Property
  const [formName, setFormName] = useState('');
  const [formCity, setFormCity] = useState<'Hammamet' | 'Sidi Bou Said' | 'Tunis' | 'Djerba' | 'Sousse'>('Hammamet');
  const [formLocation, setFormLocation] = useState('');
  const [formRate, setFormRate] = useState(450);
  const [formBedrooms] = useState(3);
  const [formWifiSSID, setFormWifiSSID] = useState('');
  const [formWifiPass, setFormWifiPass] = useState('');
  const [formDoorCode, setFormDoorCode] = useState('');

  const filtered = properties.filter((p) => {
    const matchesCity = selectedCityFilter === 'All' || p.city === selectedCityFilter;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCity && matchesSearch;
  });

  const handleSubmitNewProperty = (e: React.FormEvent) => {
    e.preventDefault();
    const newProp: Property = {
      id: `prop-${Date.now()}`,
      name: formName || 'New Tunisian Villa',
      location: formLocation || `${formCity} Coastal Area`,
      city: formCity,
      bedrooms: Number(formBedrooms),
      bathrooms: 2,
      maxGuests: Number(formBedrooms) * 2,
      nightlyRateTND: Number(formRate),
      status: 'Available',
      imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
      rating: 5.0,
      wifiSSID: formWifiSSID || `${formName.replace(/\s+/g, '')}_Guest`,
      wifiPass: formWifiPass || 'Welcome2026',
      doorCode: formDoorCode || '1234#',
      checkInTime: '15:00',
      checkOutTime: '11:00',
      trashSchedule: 'Tuesday & Friday mornings',
      houseRules: ['Standard noise curfew 22:00', 'Water conservation policy'],
      emergencyContact: '+216 98 420 112'
    };

    onAddProperty(newProp);
    setIsModalOpen(false);
    // Reset form
    setFormName('');
    setFormLocation('');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EBE6DD] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0F3D5E] bg-[#F0F6FA] px-2.5 py-1 rounded-lg border border-[#B6DAEA]">
              Tunisia Portfolio ({properties.length} Properties)
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#1C1B18] mt-1.5 tracking-tight">
            Vacation Properties Directory
          </h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            Manage listing details, rates, house rules, and smart lock credentials.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F3D5E] hover:bg-[#0C324E] text-white text-xs font-bold shadow-md transition-all shrink-0"
        >
          <Plus className="w-4 h-4 text-[#E8A838]" />
          Add New Property Listing
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-[#EBE6DD] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-3" />
          <input 
            type="text"
            placeholder="Search by villa name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 pl-10 pr-4 text-xs text-[#1C1B18] focus:outline-none focus:border-[#0F3D5E]"
          />
        </div>

        {/* Region Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {['All', 'Hammamet', 'Sidi Bou Said', 'Tunis', 'Djerba', 'Sousse'].map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCityFilter(city)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedCityFilter === city
                  ? 'bg-[#0F3D5E] text-white shadow-sm'
                  : 'bg-[#FAF8F5] text-[#3B3735] border border-[#EBE6DD] hover:bg-white'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Properties Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((prop) => (
          <div 
            key={prop.id}
            className="bg-white rounded-2xl border border-[#EBE6DD] overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col"
          >
            {/* Image Header */}
            <div className="relative h-48 overflow-hidden">
              <img 
                src={prop.imageUrl} 
                alt={prop.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-3 left-3 bg-[#1C1B18]/80 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                {prop.city}
              </div>
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-[#0F3D5E] font-extrabold text-xs px-2.5 py-1 rounded-lg border border-[#EBE6DD]">
                {prop.nightlyRateTND} TND <span className="text-[10px] font-normal text-[#78716C]">/ night</span>
              </div>
            </div>

            {/* Property Body Content */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-[#1C1B18] group-hover:text-[#0F3D5E] transition-colors">
                    {prop.name}
                  </h3>
                  <span className="text-xs font-bold text-[#D96B43]">★ {prop.rating}</span>
                </div>
                <p className="text-xs text-[#78716C] flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#D96B43]" /> {prop.location}
                </p>
              </div>

              {/* Specs */}
              <div className="py-2.5 px-3 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD] grid grid-cols-3 gap-2 text-center text-xs text-[#3B3735] font-semibold">
                <div>
                  <span className="text-[10px] text-[#78716C] block">Bedrooms</span>
                  {prop.bedrooms}
                </div>
                <div>
                  <span className="text-[10px] text-[#78716C] block">Baths</span>
                  {prop.bathrooms}
                </div>
                <div>
                  <span className="text-[10px] text-[#78716C] block">Guests</span>
                  {prop.maxGuests} Max
                </div>
              </div>

              {/* Card Footer Actions */}
              <button
                onClick={() => onSelectProperty(prop.id)}
                className="w-full py-2.5 rounded-xl bg-white border border-[#EBE6DD] text-xs font-bold text-[#0F3D5E] hover:bg-[#F0F6FA] hover:border-[#0F3D5E] transition-colors flex items-center justify-center gap-1.5"
              >
                View Knowledge Base & Rules &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Property Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1C1B18]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EBE6DD] max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-[#EBE6DD] pb-3">
              <h3 className="font-bold text-base text-[#1C1B18] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#0F3D5E]" />
                Add New Property to Vayca
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#78716C] hover:text-[#1C1B18]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewProperty} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#3B3735] mb-1">Property Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Villa Alyssa Hammamet"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#3B3735] mb-1">Region / City</label>
                  <select
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value as any)}
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                  >
                    <option value="Hammamet">Hammamet</option>
                    <option value="Sidi Bou Said">Sidi Bou Said</option>
                    <option value="Tunis">Tunis</option>
                    <option value="Djerba">Djerba</option>
                    <option value="Sousse">Sousse</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#3B3735] mb-1">Nightly Rate (TND)</label>
                  <input 
                    type="number"
                    required
                    value={formRate}
                    onChange={(e) => setFormRate(Number(e.target.value))}
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#3B3735] mb-1">Specific Location</label>
                <input 
                  type="text"
                  placeholder="e.g. South Beach Avenue, Hammamet"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#3B3735] mb-1">WiFi SSID</label>
                  <input 
                    type="text"
                    placeholder="SSID"
                    value={formWifiSSID}
                    onChange={(e) => setFormWifiSSID(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#3B3735] mb-1">WiFi Key</label>
                  <input 
                    type="text"
                    placeholder="Passcode"
                    value={formWifiPass}
                    onChange={(e) => setFormWifiPass(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#3B3735] mb-1">Door Code</label>
                  <input 
                    type="text"
                    placeholder="e.g. 5821#"
                    value={formDoorCode}
                    onChange={(e) => setFormDoorCode(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#EBE6DD] font-semibold text-[#78716C] hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-[#0F3D5E] text-white font-bold hover:bg-[#0C324E] shadow-sm"
                >
                  Create Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
