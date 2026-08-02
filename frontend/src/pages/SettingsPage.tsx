import { useState } from 'react';
import { Building, FlaskConical, Globe, Users } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { TeamManagementPanel } from '../components/TeamManagementPanel';

export function SettingsPage() {
  const { identity } = useAuth();
  const [activeTab, setActiveTab] = useState<'team' | 'company' | 'channels'>('team');
  if (!identity || identity.user.role !== 'manager') return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div className="border-b border-[#EBE6DD] pb-6">
        <span className="rounded-lg border border-[#B6DAEA] bg-[#F0F6FA] px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#0F3D5E]">System administration</span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#1C1B18]">Company Settings & Team Access</h1>
        <p className="mt-0.5 text-sm text-[#78716C]">Manage authenticated staff and review truthful integration status.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto border-b border-[#EBE6DD]">
        <Tab active={activeTab === 'team'} onClick={() => setActiveTab('team')}><Users className="h-4 w-4" /> Team</Tab>
        <Tab active={activeTab === 'company'} onClick={() => setActiveTab('company')}><Building className="h-4 w-4" /> Company</Tab>
        <Tab active={activeTab === 'channels'} onClick={() => setActiveTab('channels')}><Globe className="h-4 w-4" /> Integrations</Tab>
      </div>
      {activeTab === 'team' && <TeamManagementPanel />}
      {activeTab === 'company' && (
        <div className="max-w-2xl space-y-4 rounded-2xl border border-[#EBE6DD] bg-white p-6 shadow-sm">
          <div><div className="text-xs font-semibold text-[#78716C]">Company</div><div className="mt-1 font-bold text-[#1C1B18]">{identity.company.name}</div></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><div className="text-xs font-semibold text-[#78716C]">Timezone</div><div className="mt-1 text-sm">{identity.company.timezone}</div></div><div><div className="text-xs font-semibold text-[#78716C]">Currency</div><div className="mt-1 text-sm">{identity.company.default_currency}</div></div></div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Company profile editing belongs to the later Settings workflow. These values come from the authenticated company record.</div>
        </div>
      )}
      {activeTab === 'channels' && (
        <div className="grid gap-5 md:grid-cols-3">
          <IntegrationCard name="Airbnb Calendar" detail="No feed configured" />
          <IntegrationCard name="Booking.com Calendar" detail="No feed configured" />
          <IntegrationCard name="WhatsApp Business" detail="Simulator mode" />
        </div>
      )}
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 pb-3 text-xs font-bold ${active ? 'border-[#0F3D5E] text-[#0F3D5E]' : 'border-transparent text-[#78716C]'}`}>{children}</button>;
}

function IntegrationCard({ name, detail }: { name: string; detail: string }) {
  return <div className="space-y-3 rounded-2xl border border-[#EBE6DD] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="font-bold text-[#1C1B18]">{name}</span><span className="flex items-center gap-1 text-[10px] font-bold text-amber-700"><FlaskConical className="h-3 w-3" /> Not production</span></div><p className="text-xs text-[#78716C]">{detail}</p></div>;
}
