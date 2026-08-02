import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Copy, Plus, UserRound } from 'lucide-react';
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
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);

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
        <p className="text-xs text-[#78716C]">Managers invite staff and control whether their access is active.</p>
        <button onClick={() => setShowInvite((visible) => !visible)} className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0F3D5E] px-3.5 py-2 text-xs font-bold text-white shadow-sm">
          <Plus className="h-4 w-4 text-[#E8A838]" /> Invite team member
        </button>
      </div>

      {showInvite && (
        <form onSubmit={invite} className="grid gap-3 rounded-2xl border border-[#B6DAEA] bg-[#F0F6FA] p-4 sm:grid-cols-[1fr_1fr_auto]">
          <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} placeholder="Staff name" className="rounded-xl border border-[#EBE6DD] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F3D5E]" />
          <input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" placeholder="staff@agency.tn" className="rounded-xl border border-[#EBE6DD] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F3D5E]" />
          <button type="submit" disabled={inviting} className="rounded-xl bg-[#0F3D5E] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{inviting ? 'Creating…' : 'Create invitation'}</button>
        </form>
      )}

      {invitationUrl && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <div className="font-bold">Development invitation link</div>
          <div className="mt-1 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate">{invitationUrl}</code>
            <button type="button" onClick={() => void navigator.clipboard.writeText(invitationUrl)} title="Copy invitation link" className="rounded-lg p-1.5 hover:bg-amber-100"><Copy className="h-4 w-4" /></button>
          </div>
          <p className="mt-1 text-[10px]">This simulator link is shown once. Production requires an email adapter.</p>
        </div>
      )}

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>}
      {loading ? (
        <div className="rounded-2xl border border-[#EBE6DD] bg-white p-8 text-center text-sm text-[#78716C]">Loading team…</div>
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#EBE6DD] bg-white p-8 text-center text-sm text-[#78716C]">No team members found.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#EBE6DD] bg-white shadow-sm">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="border-b border-[#EBE6DD] bg-[#FAF8F5] uppercase tracking-wider text-[#78716C]"><tr><th className="px-5 py-3">Team member</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Access</th></tr></thead>
            <tbody className="divide-y divide-[#EBE6DD]">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-5 py-4"><div className="flex items-center gap-2.5"><span className="rounded-full bg-[#F0F6FA] p-2 text-[#0F3D5E]"><UserRound className="h-4 w-4" /></span><span className="font-bold text-[#1C1B18]">{member.name}</span></div></td>
                  <td className="px-5 py-4 text-[#3B3735]">{member.email}</td>
                  <td className="px-5 py-4 font-bold capitalize text-[#0F3D5E]">{member.role}</td>
                  <td className="px-5 py-4"><StatusBadge status={member.status} /></td>
                  <td className="px-5 py-4 text-right">{member.role === 'staff' && member.status !== 'invited' && <button disabled={updatingMemberId === member.id} onClick={() => void changeStatus(member)} className="font-bold text-[#0F3D5E] hover:underline disabled:cursor-not-allowed disabled:opacity-50">{updatingMemberId === member.id ? 'Updating…' : member.status === 'active' ? 'Deactivate' : 'Activate'}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: TeamMember['status'] }) {
  const styles = status === 'active' ? 'bg-emerald-50 text-emerald-700' : status === 'invited' ? 'bg-amber-50 text-amber-700' : 'bg-stone-100 text-stone-600';
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${styles}`}>{status}</span>;
}
