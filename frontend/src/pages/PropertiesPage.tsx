import React, { useState } from 'react';
import type { Property } from '../data/mockData';
import type { PropertyCreatePayload } from '../api/properties';
import { 
  Building2, 
  Plus, 
  MapPin, 
  Search, 
  X,
  AlertCircle,
  Loader2,
  Users,
  Archive,
  ArrowRight
} from 'lucide-react';
import { WorkstationHeader } from '../components/WorkstationHeader';
import { useI18n } from '../i18n/I18nContext';

interface PropertiesPageProps {
  properties: Property[];
  onSelectProperty: (propId: string) => void;
  onCreateProperty?: (payload: PropertyCreatePayload) => Promise<void>;
  onToggleIncludeArchived?: (include: boolean) => void;
  isManager?: boolean;
  loading?: boolean;
  error?: string | null;
  showingArchived?: boolean;
}

export const PropertiesPage: React.FC<PropertiesPageProps> = ({
  properties,
  onSelectProperty,
  onCreateProperty,
  onToggleIncludeArchived,
  isManager = true,
  loading = false,
  error = null,
  showingArchived = false
}) => {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State for Add Property
  const [formName, setFormName] = useState('');
  const [formCity, setFormCity] = useState<string>('Hammamet');
  const [formLocation, setFormLocation] = useState('');
  const [formMaxGuests, setFormMaxGuests] = useState(6);
  const [formWifiSSID, setFormWifiSSID] = useState('');
  const [formWifiPass, setFormWifiPass] = useState('');

  // Dynamically compute region/city filter buttons from loaded property data
  const uniqueCities = Array.from(new Set(properties.map((p) => p.city).filter(Boolean)));
  const dynamicCityTabs = ['All', ...uniqueCities];

  const filtered = properties.filter((p) => {
    const isArchivedProp = p.status === 'Maintenance'; // Mapped status for archived
    const matchesArchivedState = showingArchived ? isArchivedProp : !isArchivedProp;
    const matchesCity = selectedCityFilter === 'All' || (p.city || '').toLowerCase() === selectedCityFilter.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesArchivedState && matchesCity && matchesSearch;
  });

  const activeCount = properties.filter(p => p.status !== 'Maintenance').length;
  const archivedCount = properties.filter(p => p.status === 'Maintenance').length;
  const totalCapacity = properties.reduce((sum, p) => sum + (p.maxGuests || 0), 0);
  const wifiConfiguredCount = properties.filter(p => Boolean(p.wifiSSID)).length;
  const distinctCitiesCount = uniqueCities.length;

  const handleSubmitNewProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formName.trim()) {
      setFormError('Property name is required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: PropertyCreatePayload = {
        name: formName.trim(),
        address_line1: formLocation.trim() || undefined,
        city: formCity.trim() || undefined,
        max_guests: formMaxGuests > 0 ? formMaxGuests : undefined,
        wifi_network: formWifiSSID.trim() || undefined,
        wifi_password: formWifiPass.trim() || undefined,
      };

      if (onCreateProperty) {
        await onCreateProperty(payload);
      }
      setIsModalOpen(false);
      setFormName('');
      setFormLocation('');
      setFormWifiSSID('');
      setFormWifiPass('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to create property.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF8F5]">
      {/* Standardized 64px Header */}
      <WorkstationHeader
        section={t('nav.properties')}
        title={t('properties.title')}
        subtitle={t('properties.subtitle', { count: properties.length })}
        actions={
          <div className="flex items-center gap-3">
            {/* Active vs Archived View Toggle */}
            <div className="bg-[#FAF8F5] p-1 rounded-lg border border-[#EBE6DD] flex items-center gap-1 text-xs">
              <button
                onClick={() => onToggleIncludeArchived?.(false)}
                className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                  !showingArchived
                    ? 'bg-white text-[#0F3D5E] shadow-xs font-bold'
                    : 'text-[#78716C] hover:text-[#1C1B18]'
                }`}
              >
                {t('properties.tab_active')}
              </button>
              <button
                onClick={() => onToggleIncludeArchived?.(true)}
                className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  showingArchived
                    ? 'bg-amber-50 text-amber-900 border border-amber-200 shadow-xs font-bold'
                    : 'text-[#78716C] hover:text-[#1C1B18]'
                }`}
              >
                <Archive className="w-3 h-3" />
                {t('properties.tab_archived')}
              </button>
            </div>

            {isManager && (
              <button
                onClick={() => {
                  setFormError(null);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#D96B43] hover:bg-[#C25730] text-white text-xs font-bold shadow-sm transition-all shrink-0 cursor-pointer active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>{t('properties.add_btn')}</span>
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Global Error Banner */}
        {error && (
          <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-sm">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Truthful Operational Summary Bar */}
        <section className="bg-white border border-[#EBE6DD] rounded-xl p-3.5 shadow-sm grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#EBE6DD] text-xs">
          <div className="p-2 sm:px-4 flex flex-col justify-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">{t('properties.stat_active')}</span>
            <span className="text-xl font-extrabold text-[#1C1B18] mt-0.5">{activeCount}</span>
          </div>
          <div className="p-2 sm:px-4 flex flex-col justify-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">{t('properties.stat_capacity')}</span>
            <span className="text-xl font-extrabold text-[#0F3D5E] mt-0.5">{totalCapacity} <span className="text-xs font-semibold text-[#78716C]">{t('common.guests')}</span></span>
          </div>
          <div className="p-2 sm:px-4 flex flex-col justify-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">{t('properties.stat_destinations')}</span>
            <span className="text-xl font-extrabold text-[#1C1B18] mt-0.5">{distinctCitiesCount}</span>
          </div>
          <div className="p-2 sm:px-4 flex flex-col justify-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">{t('properties.stat_wifi')}</span>
            <span className="text-xl font-extrabold text-emerald-600 mt-0.5">{wifiConfiguredCount} / {properties.length}</span>
          </div>
          <div className="p-2 sm:px-4 flex flex-col justify-center col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">{t('properties.stat_archived')}</span>
            <span className="text-xl font-extrabold text-[#78716C] mt-0.5">{archivedCount}</span>
          </div>
        </section>

        {/* Filter & Search Toolbar */}
        <div className="p-3.5 bg-white rounded-xl border border-[#EBE6DD] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-2.5" />
            <input 
              type="text"
              placeholder={t('properties.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-lg py-1.5 pl-9 pr-3 text-xs text-[#1C1B18] focus:outline-none focus:border-[#0F3D5E]"
            />
          </div>

          {/* Region / Destination Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            {dynamicCityTabs.map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCityFilter(city)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedCityFilter.toLowerCase() === city.toLowerCase()
                    ? 'bg-[#0F3D5E] text-white shadow-xs'
                    : 'bg-[#FAF8F5] text-[#3B3735] border border-[#EBE6DD] hover:bg-white'
                }`}
              >
                {city === 'All' ? t('properties.all_destinations', { count: properties.length }) : city}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="loading-skeleton">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-xl border border-[#EBE6DD] h-80 animate-pulse p-4 space-y-4">
                <div className="bg-[#FAF8F5] h-40 rounded-lg w-full"></div>
                <div className="h-4 bg-[#FAF8F5] rounded w-3/4"></div>
                <div className="h-4 bg-[#FAF8F5] rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-xl border border-[#EBE6DD] p-12 text-center space-y-4 shadow-sm" data-testid="empty-state">
            <div className="mx-auto w-12 h-12 rounded-xl bg-[#F0F6FA] text-[#0F3D5E] flex items-center justify-center">
              {showingArchived ? <Archive className="w-6 h-6 text-amber-600" /> : <Building2 className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1C1B18]">
                {showingArchived ? t('properties.no_archived') : t('properties.no_properties')}
              </h3>
              <p className="text-xs text-[#78716C] max-w-md mx-auto mt-1">
                {showingArchived
                  ? 'No property records have been archived in this workspace.'
                  : properties.length === 0
                  ? 'No property listings have been added yet to your company workspace.'
                  : 'No property listings match your search or selected region filter.'}
              </p>
            </div>
            {isManager && !showingArchived && properties.length === 0 && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D96B43] text-white text-xs font-bold hover:bg-[#C25730] shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 text-white" />
                {t('properties.add_btn')}
              </button>
            )}
          </div>
        ) : (
          /* Properties Cards Grid (Architectural 2/3 Column Grid) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((prop) => {
              const isArchivedCard = prop.status === 'Maintenance';
              return (
                <div
                  key={prop.id}
                  className={`bg-white rounded-xl border overflow-hidden shadow-sm hover:border-[#B6DAEA] transition-all group flex flex-col ${
                    isArchivedCard ? 'border-amber-200 bg-amber-50/20' : 'border-[#EBE6DD]'
                  }`}
                >
                  {/* Image / Header Container */}
                  <div className="relative h-44 overflow-hidden bg-gradient-to-br from-[#0F3D5E] to-[#1E517B] flex items-center justify-center">
                    {prop.imageUrl ? (
                      <img
                        src={prop.imageUrl}
                        alt={prop.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="text-white/80 text-center space-y-1 p-4">
                        <Building2 className="w-8 h-8 mx-auto text-[#E8A838]" />
                        <span className="text-xs font-semibold block uppercase tracking-wider">{prop.city} Residence</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-[#1C1B18]/75 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                      {prop.city}
                    </div>
                    {isArchivedCard ? (
                      <div className="absolute top-3 right-3 bg-amber-500 text-white font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                        <Archive className="w-3 h-3" /> {t('common.archived')}
                      </div>
                    ) : (
                      <div className="absolute top-3 right-3 bg-emerald-700/90 text-white font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
                        {t('common.active')}
                      </div>
                    )}
                  </div>

                  {/* Property Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-base text-[#1C1B18] group-hover:text-[#0F3D5E] transition-colors truncate">
                          {prop.name}
                        </h3>
                      </div>
                      <p className="text-xs text-[#78716C] flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#D96B43] shrink-0" /> {prop.location}
                      </p>
                    </div>

                    {/* Truthful Specs & WiFi Status */}
                    <div className="pt-2 border-t border-[#EBE6DD] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {prop.wifiSSID ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F0FDF4] text-emerald-700 border border-emerald-200">
                            {t('properties.wifi_configured')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#FAF8F5] text-[#78716C] border border-[#EBE6DD]">
                            {t('properties.wifi_not_set')}
                          </span>
                        )}
                        {prop.houseRules && prop.houseRules.length > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#F0F6FA] text-[#0F3D5E] border border-[#B6DAEA]">
                            {prop.houseRules.length === 1 ? t('properties.rule_count', { count: prop.houseRules.length }) : t('properties.rules_count', { count: prop.houseRules.length })}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-semibold text-[#78716C] flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#0F3D5E]" />
                        <span>{prop.maxGuests ? `${prop.maxGuests} ${t('common.guests')}` : 'Capacity unconfigured'}</span>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <button
                      onClick={() => onSelectProperty(prop.id)}
                      className="w-full py-2 rounded-lg bg-white border border-[#EBE6DD] text-xs font-bold text-[#0F3D5E] hover:bg-[#F0F6FA] hover:border-[#0F3D5E] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>{t('properties.manage_dossier')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
                className="p-1 rounded-lg text-[#78716C] hover:text-[#1C1B18] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitNewProperty} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#3B3735] mb-1">Property Name *</label>
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
                  <input
                    type="text"
                    placeholder="e.g. Hammamet, Sidi Bou Said, Tunis"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    list="city-suggestions"
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                  />
                  <datalist id="city-suggestions">
                    <option value="Hammamet" />
                    <option value="Sidi Bou Said" />
                    <option value="Tunis" />
                    <option value="Djerba" />
                    <option value="Sousse" />
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-[#3B3735] mb-1">Max Guests</label>
                  <input 
                    type="number"
                    min={1}
                    value={formMaxGuests}
                    onChange={(e) => setFormMaxGuests(Number(e.target.value))}
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#3B3735] mb-1">Specific Location / Address</label>
                <input 
                  type="text"
                  placeholder="e.g. South Beach Avenue, Hammamet"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#3B3735] mb-1">WiFi Network (SSID)</label>
                  <input 
                    type="text"
                    placeholder="e.g. Villa_Guest_5G"
                    value={formWifiSSID}
                    onChange={(e) => setFormWifiSSID(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#3B3735] mb-1">WiFi Password</label>
                  <input 
                    type="text"
                    placeholder="Passcode"
                    value={formWifiPass}
                    onChange={(e) => setFormWifiPass(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="w-1/2 py-2.5 rounded-xl border border-[#EBE6DD] font-semibold text-[#78716C] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-2.5 rounded-xl bg-[#D96B43] text-white font-bold hover:bg-[#C25730] shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
