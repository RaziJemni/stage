import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Copy, Plus, UserRound } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { ApiError, apiRequest } from '../auth/api';
import type { TeamMember } from '../auth/types';

interface TeamListResponse {
  items: TeamMember[];
}

interface InvitationResponse {
  member: TeamMember;
  invitation_url: string | null;
}

export function TeamManagementPanel() {
  const { t } = useI18n();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  const [properties, setProperties] = useState<Array<{ id: string; name: string }>>([]);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [operationsAccess, setOperationsAccess] = useState(true);
  const [maintenanceAccess, setMaintenanceAccess] = useState(true);
  const [savingAccess, setSavingAccess] = useState(false);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<TeamListResponse>('/api/v1/team');
      setMembers(result.items);
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'The team list could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadTeam(); }, [loadTeam]);

  useEffect(() => {
    void apiRequest<{ items: Array<{ id: string; name: string }> }>('/api/v1/properties?page_size=100')
      .then((result) => setProperties(Array.isArray(result.items) ? result.items : []))
      .catch(() => setProperties([]));
  }, []);

  const openAccessEditor = (member: TeamMember) => {
    setEditingMember(member);
    setSelectedPropertyIds(member.property_ids ?? []);
    setOperationsAccess(member.operations_access ?? true);
    setMaintenanceAccess(member.maintenance_access ?? true);
  };

  const saveAccess = async () => {
    if (!editingMember) return;
    setSavingAccess(true);
    setError(null);
    try {
      const updated = await apiRequest<TeamMember>(`/api/v1/team/${editingMember.id}/access`, {
        method: 'PUT',
        body: JSON.stringify({ property_ids: selectedPropertyIds, operations_access: operationsAccess, maintenance_access: maintenanceAccess }),
      });
      setMembers((current) => current.map((member) => member.id === updated.id ? updated : member));
      setEditingMember(null);
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'The staff access could not be updated.');
    } finally {
      setSavingAccess(false);
    }
  };

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setInviting(true);
    try {
      const result = await apiRequest<InvitationResponse>('/api/v1/team/invitations', {
        method: 'POST',
        body: JSON.stringify({ name, email }),
      });
      setInvitationUrl(result.invitation_url);
      setName('');
      setEmail('');
      await loadTeam();
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'The invitation could not be created.');
    } finally {
      setInviting(false);
    }
  };

  const changeStatus = async (member: TeamMember) => {
    const status = member.status === 'active' ? 'inactive' : 'active';
    setError(null);
    setUpdatingMemberId(member.id);
    try {
      const updated = await apiRequest<TeamMember>(`/api/v1/team/${member.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setMembers((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'The team member could not be updated.');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#78716C]">{t('settings.team.desc')}</p>
        <button onClick={() => setShowInvite((visible) => !visible)} className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0F3D5E] px-3.5 py-2 text-xs font-bold text-white shadow-sm">
          <Plus className="h-4 w-4 text-[#E8A838]" /> {t('settings.team.invite_btn')}
        </button>
      </div>

      {showInvite && (
        <form onSubmit={invite} className="grid gap-3 rounded-2xl border border-[#B6DAEA] bg-[#F0F6FA] p-4 sm:grid-cols-[1fr_1fr_auto]">
          <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} placeholder={t('settings.team.name_placeholder')} className="rounded-xl border border-[#EBE6DD] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F3D5E]" />
          <input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" placeholder={t('settings.team.email_placeholder')} className="rounded-xl border border-[#EBE6DD] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F3D5E]" />
          <button type="submit" disabled={inviting} className="rounded-xl bg-[#0F3D5E] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{inviting ? t('settings.team.creating_invite') : t('settings.team.create_invite')}</button>
        </form>
      )}

      {invitationUrl && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <div className="font-bold">{t('settings.team.dev_link_title')}</div>
          <div className="mt-1 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate">{invitationUrl}</code>
            <button type="button" onClick={() => void navigator.clipboard.writeText(invitationUrl)} title={t('settings.team.copy_link')} className="rounded-lg p-1.5 hover:bg-amber-100"><Copy className="h-4 w-4" /></button>
          </div>
          <p className="mt-1 text-[10px]">{t('settings.team.dev_link_notice')}</p>
        </div>
      )}

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>}
      {editingMember && (
        <section aria-label="Staff property access" className="rounded-2xl border border-[#B6DAEA] bg-[#F0F6FA] p-4 space-y-4">
          <div><h2 className="text-sm font-bold text-[#1C1B18]">Access for {editingMember.name}</h2><p className="mt-1 text-xs text-[#57534E]">No property selected means company-wide property access.</p></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {properties.map((property) => <label key={property.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-[#3B3735]"><input type="checkbox" checked={selectedPropertyIds.includes(property.id)} onChange={(event) => setSelectedPropertyIds((current) => event.target.checked ? [...current, property.id] : current.filter((id) => id !== property.id))} />{property.name}</label>)}
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-semibold text-[#3B3735]"><label className="flex items-center gap-2"><input type="checkbox" checked={operationsAccess} onChange={(event) => setOperationsAccess(event.target.checked)} />Operations</label><label className="flex items-center gap-2"><input type="checkbox" checked={maintenanceAccess} onChange={(event) => setMaintenanceAccess(event.target.checked)} />Maintenance</label></div>
          <div className="flex gap-2"><button type="button" onClick={() => void saveAccess()} disabled={savingAccess} className="rounded-lg bg-[#0F3D5E] px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{savingAccess ? 'Saving…' : 'Save access'}</button><button type="button" onClick={() => setEditingMember(null)} disabled={savingAccess} className="rounded-lg border border-[#D6D0C7] bg-white px-3 py-2 text-xs font-bold text-[#3B3735]">Cancel</button></div>
        </section>
      )}
      {loading ? (
        <div className="rounded-2xl border border-[#EBE6DD] bg-white p-8 text-center text-sm text-[#78716C]">{t('settings.team.loading')}</div>
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#EBE6DD] bg-white p-8 text-center text-sm text-[#78716C]">{t('settings.team.empty')}</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#EBE6DD] bg-white shadow-sm">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="border-b border-[#EBE6DD] bg-[#FAF8F5] uppercase tracking-wider text-[#78716C]">
              <tr>
                <th className="px-5 py-3">{t('settings.team.th_member')}</th>
                <th className="px-5 py-3">{t('settings.team.th_email')}</th>
                <th className="px-5 py-3">{t('settings.team.th_role')}</th>
                <th className="px-5 py-3">{t('settings.team.th_status')}</th>
                <th className="px-5 py-3 text-right">{t('settings.team.th_access')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBE6DD]">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-5 py-4"><div className="flex items-center gap-2.5"><span className="rounded-full bg-[#F0F6FA] p-2 text-[#0F3D5E]"><UserRound className="h-4 w-4" /></span><span className="font-bold text-[#1C1B18]">{member.name}</span></div></td>
                  <td className="px-5 py-4 text-[#3B3735]">{member.email}</td>
                  <td className="px-5 py-4 font-bold text-[#0F3D5E]">{member.role === 'manager' ? t('settings.team.role_manager') : t('settings.team.role_staff')}</td>
                  <td className="px-5 py-4"><StatusBadge status={member.status} t={t} /></td>
                  <td className="px-5 py-4 text-right space-x-3">{member.role === 'staff' && <button type="button" onClick={() => openAccessEditor(member)} className="font-bold text-[#0F3D5E] hover:underline">Manage access</button>}{member.role === 'staff' && member.status !== 'invited' && <button disabled={updatingMemberId === member.id} onClick={() => void changeStatus(member)} className="font-bold text-[#0F3D5E] hover:underline disabled:cursor-not-allowed disabled:opacity-50">{updatingMemberId === member.id ? t('settings.team.updating') : member.status === 'active' ? t('settings.team.action_deactivate') : t('settings.team.action_activate')}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, t }: { status: TeamMember['status']; t: (k: string) => string }) {
  const styles = status === 'active' ? 'bg-emerald-50 text-emerald-700' : status === 'invited' ? 'bg-amber-50 text-amber-700' : 'bg-stone-100 text-stone-600';
  const label = status === 'active' ? t('settings.team.status_active') : status === 'invited' ? t('settings.team.status_invited') : t('settings.team.status_inactive');
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${styles}`}>{label}</span>;
}
