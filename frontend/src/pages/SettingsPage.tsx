import React, { useState } from 'react';
import type { TeamMember } from '../data/mockData';
import { 
  Users, 
  Building, 
  Globe, 
  Plus, 
  Check
} from 'lucide-react';

interface SettingsPageProps {
  team: TeamMember[];
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ team }) => {
  const [activeTab, setActiveTab] = useState<'team' | 'company' | 'channels'>('team');

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="border-b border-[#EBE6DD] pb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#0F3D5E] bg-[#F0F6FA] px-2.5 py-1 rounded-lg border border-[#B6DAEA]">
            System Administration
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[#1C1B18] mt-1.5 tracking-tight">
          Company Settings & Team Permissions
        </h1>
        <p className="text-sm text-[#78716C] mt-0.5">
          Configure property management staff, OTA channel sync APIs, and notification rules.
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-[#EBE6DD]">
        <button
          onClick={() => setActiveTab('team')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'team'
              ? 'border-[#0F3D5E] text-[#0F3D5E]'
              : 'border-transparent text-[#78716C] hover:text-[#1C1B18]'
          }`}
        >
          <Users className="w-4 h-4" /> Team Members & Roles ({team.length})
        </button>

        <button
          onClick={() => setActiveTab('company')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'company'
              ? 'border-[#0F3D5E] text-[#0F3D5E]'
              : 'border-transparent text-[#78716C] hover:text-[#1C1B18]'
          }`}
        >
          <Building className="w-4 h-4" /> Tunisian Agency Profile
        </button>

        <button
          onClick={() => setActiveTab('channels')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'channels'
              ? 'border-[#0F3D5E] text-[#0F3D5E]'
              : 'border-transparent text-[#78716C] hover:text-[#1C1B18]'
          }`}
        >
          <Globe className="w-4 h-4" /> OTA API Integrations
        </button>
      </div>

      {/* TAB 1: Team Members */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#78716C]">
              Staff roles control access to guest chat takeover, calendar edits, and property rules.
            </p>
            <button className="px-3.5 py-2 rounded-xl bg-[#0F3D5E] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm">
              <Plus className="w-4 h-4 text-[#E8A838]" /> Invite Team Member
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#EBE6DD] shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EBE6DD] text-[#78716C] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-5">Staff Member</th>
                  <th className="py-3 px-5">Email Address</th>
                  <th className="py-3 px-5">Assigned Role</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE6DD]">
                {team.map((member) => (
                  <tr key={member.id} className="hover:bg-[#FAF8F5]/50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <img 
                          src={member.avatarUrl} 
                          alt={member.name}
                          className="w-9 h-9 rounded-full object-cover border border-[#EBE6DD]"
                        />
                        <div>
                          <div className="font-bold text-[#1C1B18]">{member.name}</div>
                          <div className="text-[10px] text-[#78716C]">Tunisia Workspace</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5 font-mono text-[#3B3735]">
                      {member.email}
                    </td>

                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        member.role === 'Owner' ? 'bg-[#0F3D5E] text-[#E8A838]' :
                        member.role === 'Ops Manager' ? 'bg-amber-100 text-amber-900' :
                        member.role === 'Housekeeping Lead' ? 'bg-blue-100 text-blue-900' :
                        'bg-emerald-100 text-emerald-900'
                      }`}>
                        {member.role}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>

                    <td className="py-4 px-5 text-right">
                      <button className="text-xs font-semibold text-[#0F3D5E] hover:underline">
                        Edit Permissions
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Company Profile */}
      {activeTab === 'company' && (
        <div className="bg-white rounded-2xl border border-[#EBE6DD] p-6 shadow-sm max-w-2xl space-y-4 text-xs">
          <h3 className="font-bold text-sm text-[#1C1B18] border-b border-[#EBE6DD] pb-3">
            Tunisian Property Operations Legal Identity
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-[#3B3735] mb-1">Company Registered Name</label>
              <input 
                type="text" 
                defaultValue="Vayca Tunisia S.A.R.L."
                className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 text-[#1C1B18] font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#3B3735] mb-1">Matricule Fiscal (Tunisia)</label>
                <input 
                  type="text" 
                  defaultValue="1849201/A/M/000"
                  className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#3B3735] mb-1">Headquarters City</label>
                <input 
                  type="text" 
                  defaultValue="Hammamet, Nabeul Governorate"
                  className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#3B3735] mb-1">Primary Currency</label>
              <input 
                type="text" 
                disabled
                value="TND — Tunisian Dinar"
                className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2 px-3 font-bold text-[#0F3D5E]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#EBE6DD]">
            <button className="px-4 py-2 rounded-xl bg-[#0F3D5E] text-white font-bold shadow-sm">
              Save Company Profile
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Channel Integrations */}
      {activeTab === 'channels' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Airbnb Integration */}
          <div className="bg-white rounded-2xl border border-[#EBE6DD] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#FF5A5F] text-white">Airbnb API</span>
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> Connected
              </span>
            </div>
            <h4 className="font-bold text-xs text-[#1C1B18]">Official Airbnb Sync</h4>
            <p className="text-[11px] text-[#78716C]">
              2-way iCal & messaging sync. Auto-syncs reservations every 2 minutes.
            </p>
            <div className="pt-2 border-t border-[#EBE6DD] text-[10px] text-[#78716C] flex justify-between">
              <span>Last Sync: 1 min ago</span>
              <span className="text-[#0F3D5E] font-bold hover:underline cursor-pointer">Configure &rarr;</span>
            </div>
          </div>

          {/* Booking.com Integration */}
          <div className="bg-white rounded-2xl border border-[#EBE6DD] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#003580] text-white">Booking.com</span>
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> Connected
              </span>
            </div>
            <h4 className="font-bold text-xs text-[#1C1B18]">Booking XML Connectivity</h4>
            <p className="text-[11px] text-[#78716C]">
              Rates & availability channel manager feed for Tunisian boutique stay suites.
            </p>
            <div className="pt-2 border-t border-[#EBE6DD] text-[10px] text-[#78716C] flex justify-between">
              <span>Last Sync: Just now</span>
              <span className="text-[#0F3D5E] font-bold hover:underline cursor-pointer">Configure &rarr;</span>
            </div>
          </div>

          {/* Direct WhatsApp Gateway */}
          <div className="bg-white rounded-2xl border border-[#EBE6DD] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">WhatsApp Business</span>
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> Active
              </span>
            </div>
            <h4 className="font-bold text-xs text-[#1C1B18]">Tunisia Guest WhatsApp Bot</h4>
            <p className="text-[11px] text-[#78716C]">
              Direct guest check-in links and automated house rule delivery via WhatsApp API.
            </p>
            <div className="pt-2 border-t border-[#EBE6DD] text-[10px] text-[#78716C] flex justify-between">
              <span>Status: Active (+216 98)</span>
              <span className="text-[#0F3D5E] font-bold hover:underline cursor-pointer">Configure &rarr;</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
