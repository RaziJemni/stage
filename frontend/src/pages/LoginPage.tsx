import React, { useState } from 'react';
import { Palmtree, KeyRound, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('youssef@vayca.tn');
  const [password, setPassword] = useState('••••••••••••');
  const [companyCode, setCompanyCode] = useState('TN-HAMMAMET-882');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Subtle Mediterranean Accent Decorations */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#0F3D5E]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#D96B43]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#EBE6DD] shadow-[0_8px_30px_rgba(28,27,24,0.06)] p-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0F3D5E] text-white shadow-[0_4px_14px_rgba(15,61,94,0.25)] mb-4">
            <Palmtree className="w-7 h-7 text-[#E8A838]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1C1B18] tracking-tight">Vayca Tunisia</h1>
          <p className="text-sm text-[#78716C] mt-1 font-medium">B2B Vacation Property Management OS</p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#3B3735] mb-1.5 uppercase tracking-wider">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#78716C] absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#1C1B18] focus:outline-none focus:border-[#0F3D5E] focus:bg-white transition-colors"
                placeholder="manager@agency.tn"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3B3735] mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#78716C] absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#1C1B18] focus:outline-none focus:border-[#0F3D5E] focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3B3735] mb-1.5 uppercase tracking-wider">
              Agency License Code (Tunisia SARL)
            </label>
            <input
              type="text"
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value)}
              required
              className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl py-2.5 px-3.5 text-sm text-[#1C1B18] font-mono focus:outline-none focus:border-[#0F3D5E] focus:bg-white transition-colors"
            />
          </div>

          {/* Quick Demo Staff Selector */}
          <div className="pt-2">
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EBE6DD]">
              <span className="text-[11px] font-semibold text-[#78716C] block mb-1.5 uppercase tracking-wider">
                Demo Quick Access (Select Staff Role):
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEmail('youssef@vayca.tn')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all ${
                    email === 'youssef@vayca.tn'
                      ? 'bg-[#0F3D5E] text-white border-[#0F3D5E]'
                      : 'bg-white text-[#3B3735] border-[#EBE6DD] hover:border-[#0F3D5E]'
                  }`}
                >
                  <div className="font-semibold text-[11px]">Youssef (Owner)</div>
                  <div className="text-[9px] opacity-80">Portfolio Admin</div>
                </button>

                <button
                  type="button"
                  onClick={() => setEmail('amira@vayca.tn')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all ${
                    email === 'amira@vayca.tn'
                      ? 'bg-[#0F3D5E] text-white border-[#0F3D5E]'
                      : 'bg-white text-[#3B3735] border-[#EBE6DD] hover:border-[#0F3D5E]'
                  }`}
                >
                  <div className="font-semibold text-[11px]">Amira (Ops Mgr)</div>
                  <div className="text-[9px] opacity-80">Guest & Calendar</div>
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-4 bg-[#0F3D5E] hover:bg-[#0C324E] text-white font-semibold py-3 px-4 rounded-xl shadow-[0_4px_12px_rgba(15,61,94,0.2)] flex items-center justify-center gap-2 transition-all"
          >
            Launch Operations Workspace
            <ArrowRight className="w-4 h-4 text-[#E8A838]" />
          </button>
        </form>

        {/* Security badge */}
        <div className="mt-6 pt-4 border-t border-[#EBE6DD] flex items-center justify-center gap-2 text-xs text-[#78716C]">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Tunisian Hospitality Data Encryption Standard</span>
        </div>
      </div>

      {/* Footer text */}
      <p className="mt-6 text-xs text-[#78716C]">
        © 2026 Vayca TN — Multi-channel property operations platform (Hammamet • Sidi Bou Said • Djerba)
      </p>
    </div>
  );
};
