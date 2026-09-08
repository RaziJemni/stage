import React, { useState } from 'react';
import type { AuthCompany, AuthUser } from '../auth/types';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Building2, 
  MessageSquare, 
  CheckSquare, 
  Settings, 
  LogOut, 
  UserRound,
  X
} from 'lucide-react';
import { VaycaLogo } from './VaycaLogo';
import { useI18n } from '../i18n/I18nContext';

export type ActivePage = 
  | 'login' 
  | 'dashboard' 
  | 'calendar' 
  | 'property-detail' 
  | 'properties' 
  | 'inbox' 
  | 'conversation-thread' 
  | 'tickets' 
  | 'settings';

interface SidebarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onLogout: () => void;
  unreadMessagesCount: number;
  openTicketsCount: number;
  hasCalendarConflict: boolean;
  user: AuthUser;
  company: AuthCompany;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  onLogout,
  unreadMessagesCount,
  openTicketsCount,
  hasCalendarConflict,
  user,
  company,
}) => {
  const { t, locale } = useI18n();
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);
  const navItems = [
    { id: 'dashboard' as ActivePage, label: t('nav.dashboard'), icon: LayoutDashboard },
    { 
      id: 'calendar' as ActivePage, 
      label: t('nav.calendar'),
      icon: CalendarIcon,
      badge: hasCalendarConflict ? (locale === 'fr' ? 'Conflit' : 'Conflict') : undefined,
      badgeColor: 'bg-rose-50 text-rose-600 border border-rose-200'
    },
    { 
      id: 'inbox' as ActivePage, 
      label: t('nav.messages'),
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? `${unreadMessagesCount}` : undefined,
      badgeColor: 'bg-[#FDF4F0] text-[#D96B43] border border-[#FBE6DC]'
    },
    { 
      id: 'tickets' as ActivePage, 
      label: t('nav.maintenance'),
      icon: CheckSquare,
      badge: openTicketsCount > 0 ? `${openTicketsCount}` : undefined,
      badgeColor: 'bg-[#F0F6FA] text-[#0F3D5E] border border-[#B6DAEA]'
    },
    { id: 'properties' as ActivePage, label: t('nav.properties'), icon: Building2 },
    ...(user.role === 'manager' ? [{ id: 'settings' as ActivePage, label: t('nav.settings'), icon: Settings }] : []),
  ];
  const mobileNavItems = navItems.filter((item) => item.id !== 'settings');

  const handleMobileNavigate = (page: ActivePage) => {
    setIsMobileProfileOpen(false);
    onNavigate(page);
  };

  return (
    <>
    <aside className="hidden w-64 bg-white border-r border-[#EBE6DD] md:flex flex-col h-screen sticky top-0 z-30 shrink-0 select-none shadow-[1px_0_4px_rgba(28,27,24,0.02)]">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-[#EBE6DD] flex items-center bg-[#FAF8F5]/60">
        <VaycaLogo size="md" showWordmark={true} subtitle={t('nav.workstation')} />
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
          {t('nav.operations')}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              data-testid={`nav-${item.id}`}
              aria-label={item.label}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all group ${
                isActive
                  ? 'bg-[#F0F6FA] text-[#0F3D5E] font-bold border-l-[3px] border-[#0F3D5E] pl-[9px]'
                  : 'text-[#3B3735] font-medium hover:bg-[#FAF8F5] hover:text-[#0F3D5E] border-l-[3px] border-transparent pl-[9px]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 transition-colors ${
                  isActive ? 'text-[#0F3D5E]' : 'text-[#78716C] group-hover:text-[#0F3D5E]'
                }`} />
                <div className="text-left">{item.label}</div>
              </div>

              {item.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Prototype Notice */}
      <div className="mx-3 mb-2 rounded-lg border border-[#EBE6DD] bg-[#FAF8F5] px-3 py-2 text-[10px] font-semibold text-[#78716C] flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E8A838] shrink-0" />
        <span>{t('nav.beta_tag')}</span>
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-[#EBE6DD] bg-[#FAF8F5]/60">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#EBE6DD] shadow-sm">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="relative">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0F3D5E] text-xs font-bold text-white shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div className="truncate">
              <div className="font-semibold text-xs text-[#1C1B18] truncate">{user.name}</div>
              <div className="text-[10px] text-[#78716C] truncate">{company.name} · {user.role}</div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            title="Log out"
            className="p-1.5 rounded-lg text-[#78716C] hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>

    {/* Mobile Navigation Dock */}
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid border-t border-[#EBE6DD] bg-white/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(28,27,24,0.08)] backdrop-blur md:hidden"
      style={{ gridTemplateColumns: `repeat(${mobileNavItems.length + 1}, minmax(0, 1fr))` }}
    >
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleMobileNavigate(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex min-w-0 flex-col items-center gap-1 rounded-lg px-0.5 py-1.5 text-[8px] font-semibold tracking-tight transition-colors ${
              isActive ? 'bg-[#F0F6FA] text-[#0F3D5E]' : 'text-[#78716C]'
            }`}
          >
            <Icon className={`h-4 w-4 ${isActive ? 'text-[#0F3D5E]' : 'text-[#78716C]'}`} />
            <span className="whitespace-nowrap">{item.label}</span>
            {item.badge && (
              <span className="absolute right-1 top-0 h-2 w-2 rounded-full bg-[#D96B43]" />
            )}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setIsMobileProfileOpen(true)}
        aria-expanded={isMobileProfileOpen}
        aria-controls="mobile-profile-sheet"
        className={`relative flex min-w-0 flex-col items-center gap-1 rounded-lg px-0.5 py-1.5 text-[8px] font-semibold tracking-tight transition-colors ${
          isMobileProfileOpen ? 'bg-[#F0F6FA] text-[#0F3D5E]' : 'text-[#78716C]'
        }`}
      >
        <UserRound className={`h-4 w-4 ${isMobileProfileOpen ? 'text-[#0F3D5E]' : 'text-[#78716C]'}`} />
        <span>Profile</span>
      </button>
    </nav>

    {isMobileProfileOpen && (
      <div className="fixed inset-0 z-50 flex items-end md:hidden">
        <button
          type="button"
          aria-label="Close profile menu"
          onClick={() => setIsMobileProfileOpen(false)}
          className="absolute inset-0 bg-[#1C1B18]/35"
        />
        <section
          id="mobile-profile-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-profile-title"
          className="relative w-full rounded-t-3xl border border-[#EBE6DD] bg-white px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-16px_50px_rgba(28,27,24,0.18)]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0F3D5E] text-sm font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 id="mobile-profile-title" className="truncate text-base font-bold text-[#1C1B18]">{user.name}</h2>
                <p className="truncate text-xs text-[#78716C]">{user.email}</p>
                <p className="mt-0.5 truncate text-[11px] font-medium capitalize text-[#0F3D5E]">{company.name} · {user.role}</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close profile menu"
              onClick={() => setIsMobileProfileOpen(false)}
              className="rounded-lg p-2 text-[#78716C] hover:bg-[#FAF8F5] hover:text-[#1C1B18]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-2">
            {user.role === 'manager' && (
              <button
                type="button"
                onClick={() => handleMobileNavigate('settings')}
                className="flex w-full items-center gap-3 rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] px-4 py-3 text-left text-sm font-semibold text-[#1C1B18]"
              >
                <Settings className="h-4 w-4 text-[#0F3D5E]" />
                Company Settings
              </button>
            )}
            <button
              type="button"
              aria-label="Log out from mobile profile"
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm font-semibold text-rose-700"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </section>
      </div>
    )}
    </>
  );
};
