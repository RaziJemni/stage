import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { 
  Building2, 
  Plus, 
  AlertCircle, 
  Loader2, 
  Edit3, 
  X, 
  Mail, 
  Phone, 
  Percent, 
  UserCheck
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { 
  fetchOwners, 
  createOwner, 
  updateOwner, 
  type ApiOwner, 
  type OwnerCreatePayload, 
  type OwnerUpdatePayload 
} from '../api/owners';

export function OwnersManagementPanel() {
  const { t } = useI18n();
  const [owners, setOwners] = useState<ApiOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<ApiOwner | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCommission, setFormCommission] = useState<number | string>(20);
  const [formNotes, setFormNotes] = useState('');
  const [formActive, setFormActive] = useState(true);

  const loadOwners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchOwners(true);
      setOwners(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load owners.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOwners();
  }, [loadOwners]);

  const openCreateModal = () => {
    setEditingOwner(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormCommission(20);
    setFormNotes('');
    setFormActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (owner: ApiOwner) => {
    setEditingOwner(owner);
    setFormName(owner.name);
    setFormEmail(owner.email || '');
    setFormPhone(owner.phone || '');
    setFormCommission(owner.commission_percentage);
    setFormNotes(owner.notes || '');
    setFormActive(owner.is_active);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formName.trim()) {
      setFormError('Owner name is required.');
      return;
    }
    const commissionNum = Number(formCommission);
    if (isNaN(commissionNum) || commissionNum < 0 || commissionNum > 100) {
      setFormError('Commission percentage must be between 0 and 100.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingOwner) {
        const payload: OwnerUpdatePayload = {
          name: formName.trim(),
          email: formEmail.trim() || null,
          phone: formPhone.trim() || null,
          commission_percentage: commissionNum,
          notes: formNotes.trim() || null,
          is_active: formActive,
        };
        const updated = await updateOwner(editingOwner.id, payload);
        setOwners((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      } else {
        const payload: OwnerCreatePayload = {
          name: formName.trim(),
          email: formEmail.trim() || null,
          phone: formPhone.trim() || null,
          commission_percentage: commissionNum,
          notes: formNotes.trim() || null,
        };
        const created = await createOwner(payload);
        setOwners((prev) => [created, ...prev]);
      }
      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#1C1B18]">{t('owners.title')}</h2>
          <p className="text-xs text-[#78716C]">{t('owners.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#D96B43] hover:bg-[#C25730] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4 text-white" />
          <span>{t('owners.add_owner')}</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadOwners()}
            className="font-bold underline text-rose-900 cursor-pointer"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-[#EBE6DD] bg-white p-8 flex items-center justify-center gap-2 text-xs text-[#78716C]">
          <Loader2 className="h-4 w-4 animate-spin text-[#0F3D5E]" />
          <span>{t('common.loading')}</span>
        </div>
      ) : owners.length === 0 ? (
        <div className="rounded-xl border border-[#EBE6DD] bg-white p-12 text-center space-y-3 shadow-sm">
          <UserCheck className="mx-auto h-8 w-8 text-[#78716C]" />
          <p className="text-xs text-[#78716C]">{t('owners.no_owners')}</p>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#D96B43] px-3 py-1.5 text-xs font-bold text-white shadow-sm cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('owners.add_owner')}</span>
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#EBE6DD] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#EBE6DD] bg-[#FAF8F5] text-[11px] font-bold uppercase tracking-wider text-[#78716C]">
                <tr>
                  <th className="px-4 py-3">{t('owners.name')}</th>
                  <th className="px-4 py-3">{t('owners.email')} / {t('owners.phone')}</th>
                  <th className="px-4 py-3 text-right">{t('owners.commission')}</th>
                  <th className="px-4 py-3 text-center">{t('statements.properties_header')}</th>
                  <th className="px-4 py-3 text-center">{t('owners.status')}</th>
                  <th className="px-4 py-3 text-right">{t('statements.actions_header')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE6DD]">
                {owners.map((owner) => (
                  <tr key={owner.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-[#1C1B18]">{owner.name}</div>
                      {owner.notes && (
                        <div className="text-[11px] text-[#78716C] truncate max-w-xs mt-0.5" title={owner.notes}>
                          {owner.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[#78716C]">
                      {owner.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-[#78716C]" />
                          <span>{owner.email}</span>
                        </div>
                      )}
                      {owner.phone && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-[#78716C]" />
                          <span>{owner.phone}</span>
                        </div>
                      )}
                      {!owner.email && !owner.phone && <span className="italic">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-[#0F3D5E]">
                      {Number(owner.commission_percentage).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F0F6FA] text-[#0F3D5E] font-semibold text-[11px]">
                        <Building2 className="h-3 w-3" />
                        {owner.properties_count}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          owner.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-[#FAF8F5] text-[#78716C] border border-[#EBE6DD]'
                        }`}
                      >
                        {owner.is_active ? t('owners.active') : t('owners.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(owner)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#EBE6DD] bg-white text-xs font-semibold text-[#0F3D5E] hover:bg-[#F0F6FA] transition-colors cursor-pointer"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>{t('common.edit')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Owner Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1C1B18]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EBE6DD] max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-[#EBE6DD] pb-3">
              <h3 className="font-bold text-base text-[#1C1B18] flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#0F3D5E]" />
                {editingOwner ? t('common.edit') : t('owners.add_owner')}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
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

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#3B3735] mb-1">{t('owners.name')} *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mounir Ben Salah"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#3B3735] mb-1">{t('owners.email')}</label>
                  <input
                    type="email"
                    placeholder="mounir@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#3B3735] mb-1">{t('owners.phone')}</label>
                  <input
                    type="tel"
                    placeholder="+216 98 123 456"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#3B3735] mb-1">{t('owners.commission')} *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={formCommission}
                    onChange={(e) => setFormCommission(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 pl-3 pr-8 focus:outline-none focus:border-[#0F3D5E]"
                  />
                  <Percent className="w-3.5 h-3.5 text-[#78716C] absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#3B3735] mb-1">{t('owners.notes')}</label>
                <textarea
                  rows={2}
                  placeholder="RIB, BIC, bank notes or special contract agreements..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0F3D5E]"
                />
              </div>

              {editingOwner && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="owner-active-toggle"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="rounded text-[#0F3D5E] focus:ring-[#0F3D5E]"
                  />
                  <label htmlFor="owner-active-toggle" className="font-semibold text-[#3B3735] cursor-pointer">
                    {t('owners.active')}
                  </label>
                </div>
              )}

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="w-1/2 py-2 rounded-xl border border-[#EBE6DD] font-semibold text-[#78716C] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-2 rounded-xl bg-[#D96B43] text-white font-bold hover:bg-[#C25730] shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
