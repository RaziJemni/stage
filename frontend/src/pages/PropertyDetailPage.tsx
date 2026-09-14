import React, { useCallback, useEffect, useState } from 'react';
import type { Property } from '../data/mockData';
import type { PropertyUpdatePayload } from '../api/properties';
import {
  fetchCalendarBookings,
  type CalendarBooking,
  type BookingSource,
} from '../api/calendar';
import { 
  Wifi, 
  Key, 
  ShieldAlert, 
  Phone, 
  MapPin, 
  Users, 
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  Copy,
  Edit3,
  Archive,
  RotateCcw,
  X,
  AlertCircle,
  Loader2,
  Lock,
  FileText,
  UserCheck
} from 'lucide-react';
import { WorkstationHeader } from '../components/WorkstationHeader';
import { BookingReceiptModal } from '../components/BookingReceiptModal';
import { useI18n } from '../i18n/I18nContext';
import { fetchOwners, type ApiOwner } from '../api/owners';

const sourceBadgeClasses: Record<BookingSource, string> = {
  airbnb: 'bg-[#FF5A5F] text-white',
  booking_com: 'bg-[#003580] text-white',
  vrbo: 'bg-[#196B24] text-white',
  expedia: 'bg-[#D97706] text-white',
  direct: 'bg-[#0F3D5E] text-white',
  manual: 'bg-[#78716C] text-white',
  other: 'bg-[#57534E] text-white',
};

const sourceLabels: Record<BookingSource, string> = {
  airbnb: 'Airbnb',
  booking_com: 'Booking.com',
  vrbo: 'Vrbo',
  expedia: 'Expedia',
  direct: 'Direct',
  manual: 'Manual',
  other: 'Other',
};

function formatBookingDate(isoString: string, locale?: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return isoString;
  }
}

interface PropertyDetailPageProps {
  property: Property;
  onUpdateProperty?: (propertyId: string, payload: PropertyUpdatePayload) => Promise<void>;
  onArchiveProperty?: (propertyId: string) => Promise<void>;
  onUnarchiveProperty?: (propertyId: string) => Promise<void>;
  isManager?: boolean;
}

export const PropertyDetailPage: React.FC<PropertyDetailPageProps> = ({
  property,
  onUpdateProperty,
  onArchiveProperty,
  onUnarchiveProperty,
  isManager = true
}) => {
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<'overview' | 'secret_credentials'>('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState(property.name);
  const [editOwnerId, setEditOwnerId] = useState<string>(property.ownerId || '');
  const [editCity, setEditCity] = useState(property.city || '');
  const [editWifiSSID, setEditWifiSSID] = useState(property.wifiSSID || '');
  const [editWifiPass, setEditWifiPass] = useState(property.wifiPass || '');
  const [editHouseRules, setEditHouseRules] = useState(property.houseRules.join('\n'));
  const [editEmergencyContact, setEditEmergencyContact] = useState(property.emergencyContact || '');
  const [owners, setOwners] = useState<ApiOwner[]>([]);

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenEdit = () => {
    setEditName(property.name);
    setEditOwnerId(property.ownerId || '');
    setEditCity(property.city || '');
    setEditWifiSSID(property.wifiSSID || '');
    setEditWifiPass(property.wifiPass || '');
    setEditHouseRules(property.houseRules.join('\n'));
    setEditEmergencyContact(property.emergencyContact || '');
    setError(null);
    if (isManager && owners.length === 0) {
      fetchOwners().then(setOwners).catch(() => {});
    }
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setSubmitting(true);
      if (onUpdateProperty) {
        await onUpdateProperty(property.id, {
          name: editName.trim(),
          owner_id: editOwnerId ? editOwnerId : null,
          city: editCity.trim() || null,
          wifi_network: editWifiSSID.trim() || null,
          wifi_password: editWifiPass.trim() || null,
          house_rules: editHouseRules.trim() || null,
          emergency_contact: editEmergencyContact.trim() || null,
        });
      }
      setIsEditModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update property.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmArchive = async () => {
    setError(null);
    try {
      setSubmitting(true);
      if (onArchiveProperty) {
        await onArchiveProperty(property.id);
      }
      setIsArchiveModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to archive property.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnarchive = async () => {
    setError(null);
    try {
      setSubmitting(true);
      if (onUnarchiveProperty) {
        await onUnarchiveProperty(property.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to unarchive property.');
    } finally {
      setSubmitting(false);
    }
  };

  // Live Bookings state
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState<boolean>(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [receiptBookingId, setReceiptBookingId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    try {
      setLoadingBookings(true);
      setBookingsError(null);
      const now = new Date();
      const rangeStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const rangeEnd = new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000).toISOString();
      const items = await fetchCalendarBookings({
        propertyId: property.id,
        rangeStart,
        rangeEnd,
      });
      const activeBookings = items
        .filter((b) => b.status !== 'cancelled')
        .sort((a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime());
      setBookings(activeBookings);
    } catch (err: any) {
      setBookingsError(err.message || 'Failed to load upcoming bookings.');
    } finally {
      setLoadingBookings(false);
    }
  }, [property.id]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const isArchived = property.status === 'Maintenance';

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF8F5]">
      {/* Standardized 64px Header */}
      <WorkstationHeader
        section={t('nav.properties')}
        title={property.name}
        subtitle={property.city ? `${property.city}, Tunisie` : undefined}
        actions={
          <div className="flex items-center gap-2">
            {isManager && (
              isArchived ? (
                <button
                  type="button"
                  onClick={handleUnarchive}
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> {t('property_detail.restore_btn')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsArchiveModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5" /> {t('property_detail.archive_btn')}
                </button>
              )
            )}
          </div>
        }
      />

      <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-8">
        {error && (
          <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Property Hero Banner */}
        <div className="bg-white rounded-2xl border border-[#EBE6DD] p-6 shadow-sm flex flex-col lg:flex-row gap-6">
          {property.imageUrl ? (
            <img
              src={property.imageUrl}
              alt={property.name}
              className="w-full lg:w-72 h-52 rounded-xl object-cover border border-[#EBE6DD] shadow-xs"
            />
          ) : (
            <div className="w-full lg:w-72 h-52 rounded-xl bg-gradient-to-br from-[#0F3D5E] to-[#1E517B] flex flex-col items-center justify-center text-white p-4 text-center border border-[#EBE6DD]">
              <Building2 className="w-10 h-10 text-[#E8A838] mb-2" />
              <span className="font-bold text-sm">{property.name}</span>
              <span className="text-xs text-white/70">{property.city}, Tunisia</span>
            </div>
          )}

          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                  isArchived
                    ? 'text-amber-800 bg-amber-50 border-amber-300'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                }`}>
                  {isArchived ? (t('common.archived') || 'Archived') : (t('common.active') || 'Active')}
                </span>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-[#1C1B18] tracking-tight">{property.name}</h2>
            <p className="text-xs text-[#78716C] flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#D96B43]" /> {property.location} ({property.city}, Tunisia)
            </p>

            <div className="pt-3 border-t border-[#EBE6DD] flex items-center gap-4 text-xs font-semibold text-[#3B3735]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0F3D5E]" /> {t('property_detail.max_guests', { count: property.maxGuests || 0 })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Tab Navigation & Content */}
        <div className="space-y-6">

          {/* Tab Headers */}
          <div className="border-b border-[#EBE6DD] flex items-center gap-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-[#0F3D5E] text-[#0F3D5E]'
                  : 'border-transparent text-[#78716C] hover:text-[#1C1B18]'
              }`}
            >
              <FileText className="w-4 h-4" />
              {t('property_detail.tab_overview')}
            </button>

            <button
              onClick={() => setActiveTab('secret_credentials')}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'secret_credentials'
                  ? 'border-amber-600 text-amber-900 font-extrabold'
                  : 'border-transparent text-[#78716C] hover:text-[#1C1B18]'
              }`}
            >
              <Lock className="w-4 h-4 text-amber-600" />
              {t('property_detail.tab_credentials')}
              <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {t('property_detail.checked_in_badge')}
              </span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Main Left Content (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {activeTab === 'overview' ? (
                /* Overview & Guidelines Tab */
                <div className="bg-white rounded-2xl border border-[#EBE6DD] p-6 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-[#EBE6DD] pb-4">
                    <div>
                      <h2 className="font-bold text-base text-[#1C1B18]">{t('property_detail.tab_overview')}</h2>
                      <p className="text-xs text-[#78716C]">{property.location} · {property.city}</p>
                    </div>
                    {isManager && !isArchived && (
                      <button
                        onClick={handleOpenEdit}
                        className="px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#EBE6DD] text-xs font-semibold text-[#0F3D5E] hover:bg-[#F0F6FA] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> {t('property_detail.edit_btn')}
                      </button>
                    )}
                  </div>

                  {/* Partner Owner Attribution */}
                  <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD] flex items-center justify-between text-xs" data-testid="property-owner-info">
                    <div className="flex items-center gap-2.5">
                      <UserCheck className="w-4 h-4 text-[#0F3D5E] shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C] block">{t('properties.owner_label')}</span>
                        <span className="font-bold text-[#1C1B18]">{property.ownerName || t('properties.unassigned_owner')}</span>
                      </div>
                    </div>
                  </div>

                  {/* House Rules & Policies */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#3B3735] flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      {t('property_detail.house_rules_title')}
                    </h3>
                    <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD] space-y-2 text-xs">
                      {property.houseRules.length > 0 ? (
                        property.houseRules.map((rule, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-[#3B3735]">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{rule}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-[#78716C] italic">{t('property_detail.no_house_rules')}</span>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                /* Secret Access Credentials Tab */
                <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-sm space-y-6">

                {/* Security Protective Banner */}
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-sm">{t('property_detail.credentials_title')}</span>
                    <p className="text-[#78716C] mt-0.5">
                      {t('property_detail.credentials_warning')}
                    </p>
                  </div>
                </div>

                {/* WiFi & Key Codes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* WiFi Network Card */}
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD] space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#78716C] font-semibold">
                      <span className="flex items-center gap-1.5 text-[#0F3D5E]">
                        <Wifi className="w-4 h-4" /> {t('property_detail.wifi_network')}
                      </span>
                      {copiedField === 'wifi' && <span className="text-emerald-600 text-[10px] font-bold">{t('settings.team.copied')}</span>}
                    </div>
                    <div className="font-mono text-xs font-bold text-[#1C1B18]">
                      {property.wifiSSID || <span className="text-[#78716C] font-normal italic">{t('property_detail.wifi_not_configured')}</span>}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-[#EBE6DD]">
                      <span className="text-[11px] text-[#78716C]">
                        {t('property_detail.wifi_password')}: {property.wifiPass ? <span className="font-mono text-[#1C1B18] font-semibold">{property.wifiPass}</span> : <span className="italic">{t('property_detail.wifi_not_configured')}</span>}
                      </span>
                      {property.wifiPass ? (
                        <button
                          onClick={() => handleCopy(property.wifiPass, 'wifi')}
                          className="p-1 text-[#78716C] hover:text-[#0F3D5E] transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Smart Lock Door Code */}
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EBE6DD] space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#78716C] font-semibold">
                      <span className="flex items-center gap-1.5 text-[#D96B43]">
                        <Key className="w-4 h-4" /> {t('property_detail.door_code')}
                      </span>
                      {copiedField === 'door' && <span className="text-emerald-600 text-[10px] font-bold">{t('settings.team.copied')}</span>}
                    </div>
                    <div className="font-mono text-sm font-bold text-[#1C1B18]">
                      {property.doorCode || <span className="text-[#78716C] font-normal text-xs italic">{t('property_detail.wifi_not_configured')}</span>}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-[#EBE6DD]">
                      <span className="text-[11px] text-[#78716C]">{t('property_detail.credentials_badge')}</span>
                      {property.doorCode ? (
                        <button
                          onClick={() => handleCopy(property.doorCode, 'door')}
                          className="p-1 text-[#78716C] hover:text-[#0F3D5E] transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                </div>

                {/* Emergency Hotline Contact */}
                {property.emergencyContact ? (
                  <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-amber-700" />
                      <span className="font-semibold text-amber-900">{t('property_detail.emergency_contact')}:</span>
                    </div>
                    <span className="font-mono font-bold text-amber-950">{property.emergencyContact}</span>
                  </div>
                ) : null}

              </div>
            )}

          </div>

          {/* Property Calendar & Reservations List (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-[#EBE6DD] p-6 shadow-sm space-y-4">

              <div className="flex items-center justify-between border-b border-[#EBE6DD] pb-3">
                <h2 className="font-bold text-base text-[#1C1B18] flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#0F3D5E]" />
                  {t('property_detail.upcoming_bookings_title')}
                </h2>
                {!loadingBookings && !bookingsError && (
                  <span className="text-xs font-semibold text-[#0F3D5E] bg-[#F0F6FA] px-2.5 py-0.5 rounded-full">
                    {t('property_detail.active_bookings_badge', { count: bookings.length })}
                  </span>
                )}
              </div>

              {loadingBookings && (
                <div role="status" className="p-6 flex items-center justify-center gap-2 text-xs text-[#78716C]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0F3D5E]" />
                  <span>{t('property_detail.loading_bookings')}</span>
                </div>
              )}

              {bookingsError && (
                <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{bookingsError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadBookings()}
                    className="self-start font-bold text-rose-900 underline hover:text-rose-950 cursor-pointer"
                  >
                    {t('common.retry')}
                  </button>
                </div>
              )}

              {!loadingBookings && !bookingsError && bookings.length === 0 && (
                <div data-testid="empty-bookings" className="text-center py-6 text-xs text-[#78716C] border border-dashed border-[#EBE6DD] rounded-xl p-4">
                  {t('property_detail.empty_bookings')}
                </div>
              )}

              {!loadingBookings && !bookingsError && bookings.length > 0 && (
                <div className="space-y-3">
                  {bookings.map((bk) => (
                    <div
                      key={bk.id}
                      className="p-4 rounded-xl border bg-[#FAF8F5] border-[#EBE6DD] transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          sourceBadgeClasses[bk.source_type] || 'bg-[#0F3D5E] text-white'
                        }`}>
                          {sourceLabels[bk.source_type] || bk.source_type}
                        </span>
                        {bk.status === 'tentative' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            {t('property_detail.status_tentative')}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-end justify-between">
                        <div>
                          <div className="font-bold text-xs text-[#1C1B18]">
                            {bk.record_type === 'blocked_period'
                              ? (bk.guest_name || t('property_detail.type_blocked_period'))
                              : (bk.guest_name || t('property_detail.type_reservation'))}
                          </div>
                          <div className="text-[11px] text-[#78716C] mt-0.5">
                            {formatBookingDate(bk.check_in, locale)} &rarr; {formatBookingDate(bk.check_out, locale)}
                          </div>
                        </div>

                        {bk.record_type === 'reservation' && (
                          <button
                            type="button"
                            onClick={() => setReceiptBookingId(bk.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#B6DAEA] bg-white px-2 py-1 text-[11px] font-semibold text-[#0F3D5E] hover:bg-[#F0F6FA] transition-colors cursor-pointer"
                            data-testid={`receipt-btn-${bk.id}`}
                            title={t('calendar.receipt_btn')}
                          >
                            <FileText className="w-3 h-3 text-[#0F3D5E]" />
                            <span>{t('calendar.receipt_btn')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>

        </div>

      </div>

      {/* Edit Description & Rules Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1C1B18]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EBE6DD] max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EBE6DD] pb-3">
              <h3 className="font-bold text-base text-[#1C1B18] flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#0F3D5E]" />
                {t('property_detail.edit_modal_title')}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-[#78716C] hover:text-[#1C1B18] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#3B3735] mb-1">{t('property_detail.edit_name_label')}</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#3B3735] mb-1">{t('properties.owner_label')}</label>
                <select
                  aria-label={t('properties.owner_label')}
                  value={editOwnerId}
                  onChange={(e) => setEditOwnerId(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                >
                  <option value="">{t('properties.unassigned_owner')}</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name} ({Number(owner.commission_percentage).toFixed(1)}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#3B3735] mb-1">{t('property_detail.edit_city_label')}</label>
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#3B3735] mb-1">{t('property_detail.edit_wifi_ssid')}</label>
                  <input
                    type="text"
                    value={editWifiSSID}
                    onChange={(e) => setEditWifiSSID(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#3B3735] mb-1">{t('property_detail.edit_wifi_pass')}</label>
                  <input
                    type="text"
                    value={editWifiPass}
                    onChange={(e) => setEditWifiPass(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#3B3735] mb-1">{t('property_detail.emergency_contact')}</label>
                <input
                  type="text"
                  value={editEmergencyContact}
                  onChange={(e) => setEditEmergencyContact(e.target.value)}
                  placeholder="+216 98 000 000"
                  className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#3B3735] mb-1">{t('property_detail.edit_rules')}</label>
                <textarea
                  rows={4}
                  value={editHouseRules}
                  onChange={(e) => setEditHouseRules(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                />
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={submitting}
                  className="w-1/2 py-2.5 rounded-xl border border-[#EBE6DD] font-semibold text-[#78716C] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-2.5 rounded-xl bg-[#0F3D5E] text-white font-bold hover:bg-[#0C324E] shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1C1B18]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EBE6DD] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <Archive className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-[#1C1B18]">{t('property_detail.archive_modal_title')}</h3>
            </div>

            <p className="text-xs text-[#78716C] leading-relaxed">
              {t('property_detail.archive_modal_warning')}
            </p>

            <div className="pt-3 flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                disabled={submitting}
                className="w-1/2 py-2.5 rounded-xl border border-[#EBE6DD] font-semibold text-[#78716C] hover:bg-[#FAF8F5] cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={submitting}
                className="w-1/2 py-2.5 rounded-xl bg-rose-700 text-white font-bold hover:bg-rose-800 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('property_detail.archive_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptBookingId && (
        <BookingReceiptModal
          bookingId={receiptBookingId}
          onClose={() => setReceiptBookingId(null)}
        />
      )}

      </div>
    </div>
  );
};
